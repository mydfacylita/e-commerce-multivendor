-- ============================================================
-- OAuth 2.0 para Apps Externos (Shopify, Amazon, etc.)
-- Execute este script no banco de dados
-- ============================================================

CREATE TABLE IF NOT EXISTS `oauth_app` (
  `id`           VARCHAR(30)   NOT NULL,
  `name`         VARCHAR(255)  NOT NULL,
  `description`  TEXT          NULL,
  `logoUrl`      VARCHAR(500)  NULL,
  `clientId`     VARCHAR(100)  NOT NULL,
  `clientSecret` VARCHAR(255)  NOT NULL,
  `redirectUris` LONGTEXT      NOT NULL,
  `scopes`       LONGTEXT      NOT NULL,
  `appType`      VARCHAR(50)   NOT NULL DEFAULT 'EXTERNAL',
  `status`       VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  `createdBy`    VARCHAR(30)   NULL,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_app_clientId_key` (`clientId`),
  KEY `oauth_app_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `oauth_code` (
  `id`          VARCHAR(30)   NOT NULL,
  `code`        VARCHAR(128)  NOT NULL,
  `appId`       VARCHAR(30)   NOT NULL,
  `userId`      VARCHAR(30)   NOT NULL,
  `scopes`      LONGTEXT      NOT NULL,
  `redirectUri` VARCHAR(500)  NOT NULL,
  `expiresAt`   DATETIME(3)   NOT NULL,
  `used`        TINYINT(1)    NOT NULL DEFAULT 0,
  `createdAt`   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_code_code_key` (`code`),
  KEY `oauth_code_appId_idx` (`appId`),
  KEY `oauth_code_userId_idx` (`userId`),
  CONSTRAINT `oauth_code_appId_fkey`  FOREIGN KEY (`appId`)  REFERENCES `oauth_app`(`id`) ON DELETE CASCADE,
  CONSTRAINT `oauth_code_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `oauth_connection` (
  `id`           VARCHAR(30)   NOT NULL,
  `appId`        VARCHAR(30)   NOT NULL,
  `userId`       VARCHAR(30)   NOT NULL,
  `accessToken`  VARCHAR(512)  NOT NULL,
  `refreshToken` VARCHAR(512)  NULL,
  `scopes`       LONGTEXT      NOT NULL,
  `expiresAt`    DATETIME(3)   NULL,
  `revokedAt`    DATETIME(3)   NULL,
  `createdAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `oauth_connection_accessToken_key`  (`accessToken`),
  UNIQUE KEY `oauth_connection_refreshToken_key` (`refreshToken`),
  KEY `oauth_connection_appId_idx`  (`appId`),
  KEY `oauth_connection_userId_idx` (`userId`),
  CONSTRAINT `oauth_connection_appId_fkey`  FOREIGN KEY (`appId`)  REFERENCES `oauth_app`(`id`) ON DELETE CASCADE,
  CONSTRAINT `oauth_connection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
