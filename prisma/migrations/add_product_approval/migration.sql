-- Adicionar status de aprovação para produtos de vendedores
-- PENDING = Aguardando aprovação
-- APPROVED = Aprovado pelo admin
-- REJECTED = Rejeitado pelo admin

ALTER TABLE `Product` ADD COLUMN `approvalStatus` VARCHAR(20) DEFAULT 'APPROVED';
ALTER TABLE `Product` ADD COLUMN `approvalNote` TEXT NULL;
ALTER TABLE `Product` ADD COLUMN `approvedAt` DATETIME(3) NULL;
ALTER TABLE `Product` ADD COLUMN `approvedBy` VARCHAR(191) NULL;

-- Criar índice para filtrar por status de aprovação
CREATE INDEX `Product_approvalStatus_idx` ON `Product`(`approvalStatus`);

-- Produtos existentes de vendedores (sellerId != null e não é dropshipping) ficam como APPROVED
-- já que estavam funcionando antes
UPDATE `Product` SET `approvalStatus` = 'APPROVED' WHERE `approvalStatus` IS NULL;
