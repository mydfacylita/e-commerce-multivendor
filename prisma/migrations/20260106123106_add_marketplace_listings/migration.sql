-- AlterTable
ALTER TABLE `product` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `MarketplaceListing` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `marketplace` VARCHAR(191) NOT NULL,
    `listingId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `price` DOUBLE NULL,
    `stock` INTEGER NULL,
    `listingUrl` TEXT NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `syncEnabled` BOOLEAN NOT NULL DEFAULT true,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MarketplaceListing_marketplace_idx`(`marketplace`),
    INDEX `MarketplaceListing_status_idx`(`status`),
    UNIQUE INDEX `MarketplaceListing_productId_marketplace_key`(`productId`, `marketplace`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MarketplaceListing` ADD CONSTRAINT `MarketplaceListing_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
