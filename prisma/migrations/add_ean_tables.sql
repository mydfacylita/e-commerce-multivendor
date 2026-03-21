-- Tabela de códigos EAN gerados
CREATE TABLE IF NOT EXISTS `EANCode` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `code` VARCHAR(13) NOT NULL UNIQUE,
  `type` ENUM('OFFICIAL', 'INTERNAL') NOT NULL DEFAULT 'INTERNAL',
  `productId` VARCHAR(191) NULL,
  `used` BOOLEAN NOT NULL DEFAULT FALSE,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `usedAt` DATETIME(3) NULL,
  
  PRIMARY KEY (`id`),
  INDEX `EANCode_sellerId_idx` (`sellerId`),
  INDEX `EANCode_code_idx` (`code`),
  INDEX `EANCode_productId_idx` (`productId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tabela de créditos de EAN
CREATE TABLE IF NOT EXISTS `EANCredit` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `quantity` INT NOT NULL,
  `used` INT NOT NULL DEFAULT 0,
  `type` ENUM('OFFICIAL', 'INTERNAL') NOT NULL DEFAULT 'INTERNAL',
  `purchaseId` VARCHAR(191) NULL,
  `expiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `EANCredit_sellerId_idx` (`sellerId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tabela de compras de pacotes EAN
CREATE TABLE IF NOT EXISTS `EANPurchase` (
  `id` VARCHAR(191) NOT NULL,
  `sellerId` VARCHAR(191) NOT NULL,
  `packageId` VARCHAR(191) NOT NULL,
  `quantity` INT NOT NULL,
  `type` ENUM('OFFICIAL', 'INTERNAL') NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('PENDING', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paymentId` VARCHAR(191) NULL,
  `paidAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `EANPurchase_sellerId_idx` (`sellerId`),
  INDEX `EANPurchase_status_idx` (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
