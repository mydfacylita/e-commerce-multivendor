-- AlterTable
ALTER TABLE `order` ADD COLUMN `buyerMessages` TEXT NULL,
    ADD COLUMN `cancelReason` VARCHAR(191) NULL;
