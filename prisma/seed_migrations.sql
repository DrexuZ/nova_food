CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id VARCHAR(36) PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMPTZ,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'fAO0qigZEbouxrVcFX3o7hOvqaoVpgMyJmcpSGJ75e8=', NOW(), '20260218103330_init', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'Snbh84F01bouRhM74OQ6R211Z/f70QnLWeK7skuG2h4=', NOW(), '20260220120000_add_busy_mode_loyalty_automation', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'CHrWD6tAajw2zseLUiJcHx5MzFtsoUE9E1MLJiv6rxA=', NOW(), '20260224120000_add_settings_legal_invites', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'IglRaBRm3wAxnOSYNl2ddmew5MdEY2L6v5usdeNASuE=', NOW(), '20260302120000_add_storefront_template', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'JQxc1CHouq02fSqLFygBq7a5Qa2er020bekJwA+vYD0=', NOW(), '20260302130000_add_observability', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'VyjyD3gooXWzVZWOAUzQ2r8S0Q6FCCEWbHwFAIZJcPo=', NOW(), '20260514100737_add_gallery_images', NULL, NULL, NOW(), 1);

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, 'XZuwtzG4nyfcepaFm41ZggHlKoTgv9wZOYxjvKXvL9I=', NOW(), '20260514101500_add_media_assets', NULL, NULL, NOW(), 1);
