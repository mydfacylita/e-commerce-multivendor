ALTER TABLE `order` ADD COLUMN IF NOT EXISTS `warehouseCode` VARCHAR(100) NULL;
ALTER TABLE `order` ADD INDEX IF NOT EXISTS `idx_warehouse_code` (`warehouseCode`);
ALTER TABLE `developer_app` ADD COLUMN IF NOT EXISTS `filterConfig` JSON NULL;
