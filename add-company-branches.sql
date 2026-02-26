-- Migration: add company_branch table
-- Filiais da empresa com endereço fiscal e CNPJ próprio
-- Auto-atribuição de pedidos por UF do comprador

CREATE TABLE IF NOT EXISTS `company_branch` (
  `id`           VARCHAR(36)  NOT NULL,
  `code`         VARCHAR(100) NOT NULL,          -- igual ao warehouseCode nos pedidos
  `name`         VARCHAR(255) NOT NULL,
  `cnpj`         VARCHAR(18)  NOT NULL,
  `ie`           VARCHAR(20)  NULL,              -- Inscrição Estadual
  `im`           VARCHAR(20)  NULL,              -- Inscrição Municipal
  `street`       VARCHAR(255) NOT NULL,
  `number`       VARCHAR(20)  NOT NULL,
  `complement`   VARCHAR(100) NULL,
  `neighborhood` VARCHAR(100) NOT NULL,
  `city`         VARCHAR(100) NOT NULL,
  `state`        CHAR(2)      NOT NULL,          -- UF da filial (SP, RJ, etc.)
  `zipCode`      VARCHAR(9)   NOT NULL,
  `phone`        VARCHAR(20)  NULL,
  `email`        VARCHAR(100) NULL,
  `statesServed` JSON         NULL,              -- ["SP","MG","PR"] UFs atendidas
  `isDefault`    TINYINT(1)   NOT NULL DEFAULT 0,
  `isActive`     TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `company_branch_code_key` (`code`),
  KEY `idx_branch_state` (`state`),
  KEY `idx_branch_active` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
