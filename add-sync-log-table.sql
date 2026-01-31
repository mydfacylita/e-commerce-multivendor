-- Tabela para logs de sincronização
-- Execute este SQL para criar a tabela de logs de sincronização

CREATE TABLE IF NOT EXISTS `sync_log` (
  `id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(100) NOT NULL COMMENT 'Tipo de sincronização: ALIEXPRESS_STOCK, MARKETPLACE_ORDERS, etc',
  `totalItems` INT NOT NULL DEFAULT 0,
  `synced` INT NOT NULL DEFAULT 0,
  `errors` INT NOT NULL DEFAULT 0,
  `details` JSON NULL,
  `duration` INT NOT NULL DEFAULT 0 COMMENT 'Duração em milissegundos',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `sync_log_type_idx` (`type`),
  INDEX `sync_log_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
