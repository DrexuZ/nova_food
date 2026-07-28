import { Router } from 'express';
import {
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  listCategories,
  adjustStock,
  listMovements,
  listRecipes,
  getRecipe,
  upsertRecipe,
  deleteRecipe,
  getStockAlerts,
} from '../controllers/inventory.controller.js';
import { authenticate, requireStaff, requireRole } from '../middleware/auth.js';

const router = Router();

// Ingredients
router.get('/ingredients', listIngredients);
router.get('/ingredients/categories', listCategories);
router.get('/ingredients/alerts', getStockAlerts);
router.get('/ingredients/:id', getIngredient);
router.post('/ingredients', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), createIngredient);
router.patch('/ingredients/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), updateIngredient);
router.delete('/ingredients/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteIngredient);
router.post('/ingredients/:id/stock', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), adjustStock);

// Movements
router.get('/movements', listMovements);

// Recipes
router.get('/recipes', listRecipes);
router.get('/recipes/:id', getRecipe);
router.put('/recipes', authenticate, requireStaff, requireRole('SUPER_ADMIN', 'MANAGER'), upsertRecipe);
router.delete('/recipes/:id', authenticate, requireStaff, requireRole('SUPER_ADMIN'), deleteRecipe);

export default router;
