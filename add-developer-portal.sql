-- ========================================
-- PORTAL DE DESENVOLVEDORES - MIGRATION
-- Data: 2026-02-24
-- ⚠️  NÃO EXECUTAR SEM AUTORIZAÇÃO DO ADMINISTRADOR
-- ========================================

-- 1. Apps criados pelos desenvolvedores
CREATE TABLE IF NOT EXISTS `developer_app` (
  `id`           VARCHAR(191) NOT NULL,
  `name`         VARCHAR(255) NOT NULL,
  `description`  TEXT NULL,
  `logoUrl`      VARCHAR(500) NULL,
  `websiteUrl`   VARCHAR(500) NULL,
  `redirectUris` JSON NOT NULL,
  `status`       ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
  `ownerId`      VARCHAR(191) NOT NULL,
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `developer_app_ownerId_idx` (`ownerId`),
  INDEX `developer_app_status_idx` (`status`),
  CONSTRAINT `developer_app_ownerId_fkey`
    FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Chaves de API por app
CREATE TABLE IF NOT EXISTS `developer_api_key` (
  `id`           VARCHAR(191) NOT NULL,
  `appId`        VARCHAR(191) NOT NULL,
  `keyPrefix`    VARCHAR(20)  NOT NULL,           -- Primeiros chars visíveis (ex: "myd_live")
  `apiKey`       VARCHAR(191) NOT NULL,           -- Hash SHA-256 da chave
  `apiSecret`    TEXT         NOT NULL,           -- Hash SHA-256 do secret
  `scopes`       JSON         NOT NULL,           -- ["orders:read", "products:read", ...]
  `name`         VARCHAR(100) NULL,               -- Label (ex: "Produção")
  `isActive`     TINYINT(1)   NOT NULL DEFAULT 1,
  `lastUsedAt`   DATETIME(3)  NULL,
  `expiresAt`    DATETIME(3)  NULL,
  `requestCount` INT          NOT NULL DEFAULT 0,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `developer_api_key_apiKey_key` (`apiKey`),
  INDEX `developer_api_key_appId_idx` (`appId`),
  INDEX `developer_api_key_isActive_idx` (`isActive`),
  CONSTRAINT `developer_api_key_appId_fkey`
    FOREIGN KEY (`appId`) REFERENCES `developer_app` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Webhooks por app
CREATE TABLE IF NOT EXISTS `developer_webhook` (
  `id`            VARCHAR(191) NOT NULL,
  `appId`         VARCHAR(191) NOT NULL,
  `url`           VARCHAR(500) NOT NULL,
  `events`        JSON         NOT NULL,          -- ["order.created", "order.delivered", ...]
  `secret`        VARCHAR(191) NOT NULL,          -- Para assinar payload (HMAC-SHA256)
  `isActive`      TINYINT(1)   NOT NULL DEFAULT 1,
  `lastTriggered` DATETIME(3)  NULL,
  `failCount`     INT          NOT NULL DEFAULT 0,
  `createdAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`     DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `developer_webhook_appId_idx` (`appId`),
  INDEX `developer_webhook_isActive_idx` (`isActive`),
  CONSTRAINT `developer_webhook_appId_fkey`
    FOREIGN KEY (`appId`) REFERENCES `developer_app` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Logs de chamadas à API pública /api/v1/
CREATE TABLE IF NOT EXISTS `dev_api_log` (
  `id`           VARCHAR(191) NOT NULL,
  `appId`        VARCHAR(191) NOT NULL,
  `keyPrefix`    VARCHAR(20)  NOT NULL,
  `method`       VARCHAR(10)  NOT NULL,
  `path`         VARCHAR(255) NOT NULL,
  `statusCode`   INT          NOT NULL,
  `latencyMs`    INT          NOT NULL,
  `ipAddress`    VARCHAR(100) NULL,
  `userAgent`    TEXT         NULL,
  `requestBody`  JSON         NULL,
  `responseBody` JSON         NULL,
  `error`        TEXT         NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `dev_api_log_appId_idx` (`appId`),
  INDEX `dev_api_log_path_idx` (`path`),
  INDEX `dev_api_log_statusCode_idx` (`statusCode`),
  INDEX `dev_api_log_createdAt_idx` (`createdAt`),
  CONSTRAINT `dev_api_log_appId_fkey`
    FOREIGN KEY (`appId`) REFERENCES `developer_app` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
