-- Criação da tabela de solicitações de devolução para MySQL/MariaDB
-- Data: 2025-01-19
-- Descrição: Tabela para gerenciar solicitações de devolução de produtos

CREATE TABLE IF NOT EXISTS `return_request` (
    `id` VARCHAR(255) NOT NULL,
    `orderId` VARCHAR(255) NOT NULL,
    `userId` VARCHAR(255) NOT NULL,
    `itemIds` JSON NOT NULL COMMENT 'Array de IDs dos itens a serem devolvidos',
    `reason` VARCHAR(255) NOT NULL COMMENT 'Motivo da devolução',
    `description` TEXT NULL COMMENT 'Descrição adicional (opcional)',
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'Status da solicitação',
    `adminNotes` TEXT NULL COMMENT 'Observações do administrador',
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL COMMENT 'Data de revisão pelo admin',
    `reviewedBy` VARCHAR(255) NULL COMMENT 'ID do admin que revisou',
    `completedAt` DATETIME(3) NULL COMMENT 'Data de conclusão da devolução',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Criar índices para performance
CREATE INDEX `return_request_orderId_idx` ON `return_request`(`orderId`);
CREATE INDEX `return_request_userId_idx` ON `return_request`(`userId`);
CREATE INDEX `return_request_status_idx` ON `return_request`(`status`);
CREATE INDEX `return_request_requestedAt_idx` ON `return_request`(`requestedAt`);

-- Adicionar foreign keys (se as tabelas existirem)
-- ALTER TABLE `return_request` ADD CONSTRAINT `return_request_orderId_fkey` 
--     FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
-- 
-- ALTER TABLE `return_request` ADD CONSTRAINT `return_request_userId_fkey` 
--     FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;