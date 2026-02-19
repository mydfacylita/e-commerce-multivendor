-- ========================================
-- SISTEMA DE POSTAGEM SOCIAL
-- Data: 2026-02-13
-- ========================================

-- Tabela de conexões de redes sociais
CREATE TABLE IF NOT EXISTS `social_connection` (
  `id` VARCHAR(191) NOT NULL,
  `platform` ENUM('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'PINTEREST') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `platformId` VARCHAR(255) NOT NULL,
  `accessToken` TEXT NOT NULL,
  `refreshToken` TEXT NULL,
  `expiresAt` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `social_connection_platform_platformId_key` (`platform`, `platformId`),
  INDEX `social_connection_platform_idx` (`platform`),
  INDEX `social_connection_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de posts sociais
CREATE TABLE IF NOT EXISTS `social_post` (
  `id` VARCHAR(191) NOT NULL,
  `connectionId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `platform` ENUM('FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'PINTEREST') NOT NULL,
  `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'DRAFT',
  `caption` TEXT NOT NULL,
  `images` JSON NOT NULL,
  `scheduledFor` DATETIME(3) NULL,
  `publishedAt` DATETIME(3) NULL,
  `platformPostId` VARCHAR(255) NULL,
  `platformUrl` VARCHAR(500) NULL,
  `stats` JSON NULL,
  `errorMessage` TEXT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `social_post_connectionId_idx` (`connectionId`),
  INDEX `social_post_productId_idx` (`productId`),
  INDEX `social_post_platform_idx` (`platform`),
  INDEX `social_post_status_idx` (`status`),
  INDEX `social_post_scheduledFor_idx` (`scheduledFor`),
  INDEX `social_post_createdAt_idx` (`createdAt`),
  CONSTRAINT `social_post_connectionId_fkey` FOREIGN KEY (`connectionId`) REFERENCES `social_connection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `social_post_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
