-- ================================================
-- SCRIPT PARA ADICIONAR CAMPOS FALTANDO NO BANCO
-- Generated: 2026-02-12
-- Description: Adiciona todos os campos que estão 
--              no schema Prisma mas faltando no DB
-- ================================================

-- TABELA USER - Adicionar campos de bloqueio
ALTER TABLE user 
ADD COLUMN blockedAt DATETIME NULL,
ADD COLUMN blockedReason VARCHAR(255) NULL;

-- TABELA ORDER - Adicionar todos os campos faltando
ALTER TABLE `order` 
ADD COLUMN parentOrderId VARCHAR(191) NULL,
ADD COLUMN correiosIdPrePostagem VARCHAR(191) NULL,
ADD COLUMN deliveryDays INT NULL,
ADD COLUMN expeditionNotes TEXT NULL,
ADD COLUMN labelPrintedAt DATETIME NULL,
ADD COLUMN packagingBoxId VARCHAR(191) NULL,
ADD COLUMN packedAt DATETIME NULL,
ADD COLUMN packedBy VARCHAR(191) NULL,
ADD COLUMN separatedAt DATETIME NULL,
ADD COLUMN separatedBy VARCHAR(191) NULL,
ADD COLUMN shippedAt DATETIME NULL,
ADD COLUMN shippedBy VARCHAR(191) NULL,
ADD COLUMN shippingCarrier VARCHAR(191) NULL,
ADD COLUMN shippingLabel TEXT NULL,
ADD COLUMN shippingLabelType VARCHAR(191) NULL,
ADD COLUMN shippingMethod VARCHAR(191) NULL,
ADD COLUMN shippingService VARCHAR(191) NULL,
ADD COLUMN fraudScore INT NULL,
ADD COLUMN fraudReasons TEXT NULL,
ADD COLUMN fraudStatus VARCHAR(50) NULL,
ADD COLUMN fraudCheckedAt DATETIME NULL,
ADD COLUMN fraudCheckedBy VARCHAR(255) NULL,
ADD COLUMN fraudNotes TEXT NULL,
ADD COLUMN ipAddress VARCHAR(100) NULL,
ADD COLUMN userAgent TEXT NULL,
ADD COLUMN importTax DOUBLE NULL,
ADD COLUMN icmsTax DOUBLE NULL,
ADD COLUMN deliveredAt DATETIME NULL,
ADD COLUMN deliveredBy VARCHAR(191) NULL,
ADD COLUMN receiverName VARCHAR(191) NULL,
ADD COLUMN receiverDocument VARCHAR(191) NULL,
ADD COLUMN deliveryNotes TEXT NULL,
ADD COLUMN deliveryPhoto TEXT NULL,
ADD COLUMN deliveryAttempts INT DEFAULT 0,
ADD COLUMN affiliateId VARCHAR(191) NULL,
ADD COLUMN affiliateCode VARCHAR(191) NULL,
ADD COLUMN couponCode VARCHAR(191) NULL,
ADD COLUMN discountAmount DOUBLE NULL,
ADD COLUMN subtotal DOUBLE NULL;

-- Adicionar índices importantes
ALTER TABLE `order` 
ADD INDEX idx_parentOrderId (parentOrderId),
ADD INDEX idx_affiliateId (affiliateId),
ADD INDEX idx_packagingBoxId (packagingBoxId),
ADD INDEX idx_shippingMethod (shippingMethod),
ADD INDEX idx_fraudScore (fraudScore),
ADD INDEX idx_fraudStatus (fraudStatus),
ADD INDEX idx_correiosPrePostagem (correiosIdPrePostagem);

-- Adicionar foreign key para affiliate se necessário
-- ALTER TABLE `order` 
-- ADD FOREIGN KEY fk_order_affiliate (affiliateId) REFERENCES affiliate(id) ON DELETE SET NULL;

COMMIT;