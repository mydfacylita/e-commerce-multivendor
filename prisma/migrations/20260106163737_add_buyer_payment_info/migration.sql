-- AlterTable
ALTER TABLE `order` ADD COLUMN `buyerCpf` VARCHAR(191) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `shippingCost` DOUBLE NULL;
