-- Add hybrid order support (dropshipping + stock items in same order)

-- 1. Create ItemType enum
CREATE TABLE IF NOT EXISTS `_prisma_migrations_itemtype` (
  `value` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add new columns to orderitem table
ALTER TABLE `orderitem`
  ADD COLUMN `itemType` ENUM('DROPSHIPPING', 'STOCK') NOT NULL DEFAULT 'STOCK' AFTER `createdAt`,
  ADD COLUMN `supplierOrderId` VARCHAR(191) NULL AFTER `sellerRevenue`,
  ADD COLUMN `supplierStatus` VARCHAR(191) NULL AFTER `supplierOrderId`,
  ADD COLUMN `supplierCost` DOUBLE NULL AFTER `supplierStatus`,
  ADD COLUMN `trackingCode` VARCHAR(191) NULL AFTER `supplierCost`;

-- 3. Add indexes
ALTER TABLE `orderitem`
  ADD INDEX `orderitem_itemType_idx` (`itemType`),
  ADD INDEX `orderitem_sellerId_idx` (`sellerId`);

-- 4. Update existing records: set itemType based on product isDropshipping flag
UPDATE `orderitem` oi
INNER JOIN `product` p ON oi.productId = p.id
SET oi.itemType = IF(p.isDropshipping = 1, 'DROPSHIPPING', 'STOCK');
