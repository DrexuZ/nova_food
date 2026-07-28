INSERT INTO "users" ("id", "email", "password", "name", "role", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'admin@kitchenasty.com', '$2b$10$e3tnOILvWr04uw1VaCdy9e0C1Y51R2COzzZAvZMGxdaxZKTeQQZ9a', 'Admin', 'SUPER_ADMIN', true, NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "updatedAt" = NOW();

INSERT INTO "customers" ("id", "email", "password", "name", "phone", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'customer@example.com', '$2b$10$e3tnOILvWr04uw1VaCdy9e0C1Y51R2COzzZAvZMGxdaxZKTeQQZ9a', 'John Doe', '(555) 987-6543', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "updatedAt" = NOW();
