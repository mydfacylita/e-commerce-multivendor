-- AlterTable
ALTER TABLE `product` ADD COLUMN `shippingCost` DOUBLE NULL,
    ADD COLUMN `taxCost` DOUBLE NULL,
    ADD COLUMN `totalCost` DOUBLE NULL;
