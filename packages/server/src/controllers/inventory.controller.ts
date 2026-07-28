import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';

const ingredientSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNIDAD', 'DOCENA', 'PAQUETE', 'LITRO', 'KILO', 'GRAMO', 'MILILITRO', 'CAJA', 'BOTELLA', 'LATA', 'PORCION']).default('UNIDAD'),
  stock: z.number().min(0).default(0),
  minStock: z.number().min(0).default(0),
  cost: z.number().min(0).default(0),
  image: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
  locationId: z.string().optional(),
});

export async function listIngredients(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;

  const [ingredients, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.ingredient.count({ where }),
  ]);

  res.json({
    success: true,
    data: ingredients,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getIngredient(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) {
    res.status(404).json({ success: false, error: 'Ingredient not found' });
    return;
  }
  res.json({ success: true, data: ingredient });
}

export async function createIngredient(req: Request, res: Response): Promise<void> {
  const parsed = ingredientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const ingredient = await prisma.ingredient.create({ data: parsed.data });

  if (parsed.data.stock > 0) {
    await prisma.inventoryMovement.create({
      data: {
        ingredientId: ingredient.id,
        type: 'ADJUSTMENT_ADD',
        quantity: parsed.data.stock,
        stockBefore: 0,
        stockAfter: parsed.data.stock,
        note: 'Initial stock on creation',
        createdById: (req as any).user?.id,
      },
    });
  }

  auditLog(req, { action: 'create', entity: 'Ingredient', entityId: ingredient.id, details: { name: ingredient.name } });
  res.status(201).json({ success: true, data: ingredient });
}

export async function updateIngredient(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = ingredientSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.ingredient.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Ingredient not found' });
    return;
  }

  const { stock, ...data } = parsed.data;

  const ingredient = await prisma.ingredient.update({
    where: { id },
    data,
  });

  if (stock !== undefined && stock !== existing.stock) {
    const diff = stock - existing.stock;
    await prisma.inventoryMovement.create({
      data: {
        ingredientId: id,
        type: diff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_REMOVE',
        quantity: diff,
        stockBefore: existing.stock,
        stockAfter: stock,
        note: 'Manual stock adjustment',
        createdById: (req as any).user?.id,
      },
    });

    await prisma.ingredient.update({
      where: { id },
      data: { stock },
    });
  }

  auditLog(req, { action: 'update', entity: 'Ingredient', entityId: id, details: { name: ingredient.name } });
  res.json({ success: true, data: ingredient });
}

export async function deleteIngredient(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.ingredient.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Ingredient not found' });
    return;
  }

  const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: id } });
  if (recipeCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Cannot delete ingredient that is part of a recipe. Deactivate it instead.',
    });
    return;
  }

  await prisma.ingredient.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'Ingredient', entityId: id, details: { name: existing.name } });
  res.json({ success: true, message: 'Ingredient deleted' });
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  const categories = await prisma.ingredient.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  res.json({
    success: true,
    data: categories.map((c) => c.category).filter(Boolean),
  });
}

export async function adjustStock(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const schema = z.object({
    type: z.enum(['PURCHASE', 'SPOILAGE', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE']),
    quantity: z.number().positive(),
    note: z.string().optional(),
    reference: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) {
    res.status(404).json({ success: false, error: 'Ingredient not found' });
    return;
  }

  const isAdd = parsed.data.type === 'PURCHASE' || parsed.data.type === 'ADJUSTMENT_ADD';
  const delta = isAdd ? parsed.data.quantity : -parsed.data.quantity;
  const newStock = Math.max(0, ingredient.stock + delta);

  if (!isAdd && ingredient.stock < parsed.data.quantity) {
    res.status(400).json({
      success: false,
      error: `Insufficient stock. Available: ${ingredient.stock} ${ingredient.unit}`,
    });
    return;
  }

  await prisma.$transaction([
    prisma.ingredient.update({
      where: { id },
      data: { stock: newStock },
    }),
    prisma.inventoryMovement.create({
      data: {
        ingredientId: id,
        type: parsed.data.type,
        quantity: delta,
        stockBefore: ingredient.stock,
        stockAfter: newStock,
        reference: parsed.data.reference,
        note: parsed.data.note,
        createdById: (req as any).user?.id,
      },
    }),
  ]);

  const updated = await prisma.ingredient.findUnique({ where: { id } });
  res.json({ success: true, data: updated });
}

export async function listMovements(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const ingredientId = req.query.ingredientId as string | undefined;
  const type = req.query.type as string | undefined;

  const where: Record<string, unknown> = {};
  if (ingredientId) where.ingredientId = ingredientId;
  if (type) where.type = type;

  const [movements, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.inventoryMovement.count({ where }),
  ]);

  res.json({
    success: true,
    data: movements,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// RECIPES

const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNIDAD', 'DOCENA', 'PAQUETE', 'LITRO', 'KILO', 'GRAMO', 'MILILITRO', 'CAJA', 'BOTELLA', 'LATA', 'PORCION']).default('UNIDAD'),
  notes: z.string().optional(),
});

const recipeSchema = z.object({
  name: z.string().optional(),
  menuItemId: z.string().min(1),
  yield: z.number().int().positive().default(1),
  instructions: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).optional(),
});

export async function listRecipes(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const menuItemId = req.query.menuItemId as string | undefined;

  const where: Record<string, unknown> = {};
  if (menuItemId) where.menuItemId = menuItemId;

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        menuItem: { select: { id: true, name: true } },
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true, stock: true, minStock: true } } },
        },
      },
    }),
    prisma.recipe.count({ where }),
  ]);

  res.json({
    success: true,
    data: recipes,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getRecipe(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      menuItem: { select: { id: true, name: true } },
      ingredients: {
        include: { ingredient: { select: { id: true, name: true, unit: true, stock: true, minStock: true, cost: true } } },
      },
    },
  });
  if (!recipe) {
    res.status(404).json({ success: false, error: 'Recipe not found' });
    return;
  }
  res.json({ success: true, data: recipe });
}

export async function upsertRecipe(req: Request, res: Response): Promise<void> {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { ingredients, ...data } = parsed.data;

  const menuItem = await prisma.menuItem.findUnique({ where: { id: data.menuItemId } });
  if (!menuItem) {
    res.status(400).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const recipe = await prisma.recipe.upsert({
    where: {
      menuItemId: data.menuItemId,
    },
    update: {
      name: data.name,
      yield: data.yield,
      instructions: data.instructions,
      ingredients: ingredients ? {
        deleteMany: {},
        create: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
      } : undefined,
    },
    create: {
      menuItemId: data.menuItemId,
      name: data.name,
      yield: data.yield,
      instructions: data.instructions,
      ingredients: ingredients ? {
        create: ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes,
        })),
      } : undefined,
    },
    include: {
      menuItem: { select: { id: true, name: true } },
      ingredients: {
        include: { ingredient: { select: { id: true, name: true, unit: true, stock: true, minStock: true, cost: true } } },
      },
    },
  });

  auditLog(req, { action: 'update', entity: 'Recipe', entityId: recipe.id, details: { menuItemId: data.menuItemId } });
  res.json({ success: true, data: recipe });
}

export async function deleteRecipe(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Recipe not found' });
    return;
  }
  await prisma.recipe.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'Recipe', entityId: id });
  res.json({ success: true, message: 'Recipe deleted' });
}

export async function getStockAlerts(req: Request, res: Response): Promise<void> {
  const alerts = await prisma.ingredient.findMany({
    where: {
      isActive: true,
      stock: { lte: prisma.ingredient.fields.minStock },
    },
    orderBy: [{ stock: 'asc' }],
  });

  res.json({ success: true, data: alerts });
}
