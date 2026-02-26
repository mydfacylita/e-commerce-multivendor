-- =====================================================
-- Shopify Partners App Integration
-- Mydshop app listed on Shopify App Store
-- =====================================================

CREATE TABLE IF NOT EXISTS `shopify_installation` (
  `id`           VARCHAR(36)  NOT NULL DEFAULT (UUID()),
  `shopDomain`   VARCHAR(255) NOT NULL COMMENT 'e.g. my-store.myshopify.com',
  `accessToken`  VARCHAR(500) NOT NULL,
  `scope`        VARCHAR(1000) NOT NULL,
  `userId`       VARCHAR(36)  NULL COMMENT 'linked Mydshop seller/user id',
  `shopName`     VARCHAR(255) NULL,
  `shopEmail`    VARCHAR(255) NULL,
  `shopPlan`     VARCHAR(100) NULL,
  `shopCurrency` VARCHAR(10)  NULL DEFAULT 'BRL',
  `shopTimezone` VARCHAR(100) NULL,
  `isActive`     TINYINT(1)   NOT NULL DEFAULT 1,
  `installedAt`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `uninstalledAt` DATETIME    NULL,
  `lastSyncAt`   DATETIME     NULL,
  `syncOrdersEnabled`   TINYINT(1) NOT NULL DEFAULT 1,
  `syncProductsEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `webhookSecret` VARCHAR(255) NULL COMMENT 'HMAC secret for webhook validation',
  `createdAt`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shopify_domain` (`shopDomain`),
  KEY `idx_shopify_user` (`userId`),
  KEY `idx_shopify_active` (`isActive`),
  CONSTRAINT `fk_shopify_user`
    FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track synced Shopify orders to avoid duplicates
CREATE TABLE IF NOT EXISTS `shopify_order_sync` (
  `id`              VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `installationId`  VARCHAR(36) NOT NULL,
  `shopifyOrderId`  VARCHAR(100) NOT NULL COMMENT 'Shopify order gid/id',
  `shopifyOrderNumber` VARCHAR(50) NULL,
  `mydOrderId`      VARCHAR(36) NULL COMMENT 'Mydshop order id after import',
  `status`          ENUM('pending','synced','failed','skipped') NOT NULL DEFAULT 'pending',
  `errorMessage`    TEXT NULL,
  `syncedAt`        DATETIME NULL,
  `createdAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shopify_order` (`installationId`, `shopifyOrderId`),
  KEY `idx_shopify_order_myd` (`mydOrderId`),
  CONSTRAINT `fk_shopify_order_install`
    FOREIGN KEY (`installationId`) REFERENCES `shopify_installation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track synced Mydshop → Shopify products
CREATE TABLE IF NOT EXISTS `shopify_product_sync` (
  `id`              VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `installationId`  VARCHAR(36) NOT NULL,
  `mydProductId`    VARCHAR(36) NOT NULL,
  `shopifyProductId` VARCHAR(100) NULL COMMENT 'Shopify product gid/id',
  `shopifyVariantId` VARCHAR(100) NULL,
  `status`          ENUM('pending','synced','failed','skipped') NOT NULL DEFAULT 'pending',
  `errorMessage`    TEXT NULL,
  `syncedAt`        DATETIME NULL,
  `createdAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shopify_product` (`installationId`, `mydProductId`),
  KEY `idx_shopify_product_shopify_id` (`shopifyProductId`),
  CONSTRAINT `fk_shopify_product_install`
    FOREIGN KEY (`installationId`) REFERENCES `shopify_installation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
