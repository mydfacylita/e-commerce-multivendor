-- AlterTable
ALTER TABLE `product` ADD COLUMN `availableForDropship` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isChoiceProduct` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastSyncAt` DATETIME(3) NULL,
    ADD COLUMN `supplierRating` DOUBLE NULL,
    ADD COLUMN `supplierShippingSpeed` DOUBLE NULL,
    ADD COLUMN `supplierStock` INTEGER NULL,
    ADD COLUMN `supplierStoreId` VARCHAR(191) NULL,
    ADD COLUMN `supplierStoreName` VARCHAR(191) NULL;
