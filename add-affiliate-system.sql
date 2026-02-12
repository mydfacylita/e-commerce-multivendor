-- ========================================
-- SISTEMA DE AFILIADOS - MIGRATION
-- Data: 2026-02-11
-- ========================================

-- Tabela principal de afiliados
CREATE TABLE IF NOT EXISTS `affiliate` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `cpf` VARCHAR(14) NULL,
  `instagram` VARCHAR(255) NULL,
  `youtube` VARCHAR(255) NULL,
  `tiktok` VARCHAR(255) NULL,
  `otherSocial` TEXT NULL,
  `commissionRate` DOUBLE NOT NULL DEFAULT 5,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `totalSales` DOUBLE NOT NULL DEFAULT 0,
  `totalCommission` DOUBLE NOT NULL DEFAULT 0,
  `availableBalance` DOUBLE NOT NULL DEFAULT 0,
  `totalWithdrawn` DOUBLE NOT NULL DEFAULT 0,
  `banco` VARCHAR(100) NULL,
  `agencia` VARCHAR(20) NULL,
  `conta` VARCHAR(30) NULL,
  `tipoConta` VARCHAR(20) NULL,
  `chavePix` VARCHAR(255) NULL,
  `cookieDays` INT NOT NULL DEFAULT 30,
  `notes` TEXT NULL,
  `approvedAt` DATETIME(3) NULL,
  `approvedBy` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `affiliate_userId_key` (`userId`),
  UNIQUE INDEX `affiliate_code_key` (`code`),
  UNIQUE INDEX `affiliate_email_key` (`email`),
  INDEX `affiliate_code_idx` (`code`),
  INDEX `affiliate_status_idx` (`status`),
  INDEX `affiliate_userId_idx` (`userId`),
  INDEX `affiliate_isActive_idx` (`isActive`),
  CONSTRAINT `affiliate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de vendas por afiliado
CREATE TABLE IF NOT EXISTS `affiliate_sale` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NULL,
  `customerName` VARCHAR(255) NULL,
  `customerEmail` VARCHAR(255) NULL,
  `orderTotal` DOUBLE NOT NULL,
  `commissionRate` DOUBLE NOT NULL,
  `commissionAmount` DOUBLE NOT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `affiliate_sale_orderId_key` (`orderId`),
  INDEX `affiliate_sale_affiliateId_idx` (`affiliateId`),
  INDEX `affiliate_sale_orderId_idx` (`orderId`),
  INDEX `affiliate_sale_status_idx` (`status`),
  INDEX `affiliate_sale_createdAt_idx` (`createdAt`),
  CONSTRAINT `affiliate_sale_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `affiliate_sale_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de saques de afiliados
CREATE TABLE IF NOT EXISTS `affiliate_withdrawal` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL,
  `method` VARCHAR(50) NOT NULL,
  `pixKey` VARCHAR(255) NULL,
  `bankInfo` TEXT NULL,
  `notes` TEXT NULL,
  `proofUrl` VARCHAR(500) NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `processedBy` VARCHAR(191) NULL,
  `rejectedAt` DATETIME(3) NULL,
  `rejectionReason` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `affiliate_withdrawal_affiliateId_idx` (`affiliateId`),
  INDEX `affiliate_withdrawal_status_idx` (`status`),
  INDEX `affiliate_withdrawal_requestedAt_idx` (`requestedAt`),
  CONSTRAINT `affiliate_withdrawal_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de cliques/rastreamento
CREATE TABLE IF NOT EXISTS `affiliate_click` (
  `id` VARCHAR(191) NOT NULL,
  `affiliateId` VARCHAR(191) NOT NULL,
  `ipAddress` VARCHAR(100) NULL,
  `userAgent` TEXT NULL,
  `referrer` TEXT NULL,
  `landingPage` TEXT NULL,
  `converted` BOOLEAN NOT NULL DEFAULT false,
  `orderId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `affiliate_click_affiliateId_idx` (`affiliateId`),
  INDEX `affiliate_click_createdAt_idx` (`createdAt`),
  INDEX `affiliate_click_converted_idx` (`converted`),
  CONSTRAINT `affiliate_click_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar campos de afiliado na tabela de pedidos
ALTER TABLE `order` 
  ADD COLUMN `affiliateId` VARCHAR(191) NULL AFTER `deliveryAttempts`,
  ADD COLUMN `affiliateCode` VARCHAR(191) NULL AFTER `affiliateId`,
  ADD INDEX `order_affiliateId_idx` (`affiliateId`);

-- ========================================
-- ADAPTAR CONTA DIGITAL PARA AFILIADOS
-- ========================================

-- Modificar seller_account para suportar afiliados também
ALTER TABLE `seller_account`
  MODIFY COLUMN `sellerId` VARCHAR(191) NULL,
  ADD COLUMN `affiliateId` VARCHAR(191) NULL AFTER `sellerId`,
  ADD COLUMN `accountType` VARCHAR(20) NOT NULL DEFAULT 'SELLER' AFTER `accountNumber`,
  ADD UNIQUE INDEX `seller_account_affiliateId_key` (`affiliateId`),
  ADD INDEX `seller_account_affiliateId_idx` (`affiliateId`),
  ADD INDEX `seller_account_accountType_idx` (`accountType`),
  ADD CONSTRAINT `seller_account_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Logs de auditoria
INSERT INTO `audit_log` (`id`, `userId`, `action`, `resource`, `status`, `details`, `createdAt`)
VALUES (
  CONCAT('audit_', UUID()),
  'SYSTEM',
  'DATABASE_MIGRATION',
  'affiliate_system',
  'SUCCESS',
  '{"migration": "add-affiliate-system", "tables": ["affiliate", "affiliate_sale", "affiliate_withdrawal", "affiliate_click"], "version": "1.0"}',
  NOW()
);

-- ========================================
-- Dados iniciais para testes (OPCIONAL)
-- ========================================

-- Exemplo de afiliado teste (descomente para usar)
/*
INSERT INTO `affiliate` (
  `id`, `userId`, `code`, `name`, `email`, `commissionRate`, 
  `status`, `isActive`, `createdAt`, `updatedAt`
) 
SELECT 
  CONCAT('aff_', UUID()),
  u.id,
  'TESTE123',
  'Afiliado Teste',
  u.email,
  5.0,
  'APPROVED',
  1,
  NOW(),
  NOW()
FROM `user` u
WHERE u.role = 'ADMIN'
LIMIT 1;
*/
