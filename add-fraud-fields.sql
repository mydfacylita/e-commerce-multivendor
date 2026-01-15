-- Adicionar campos de antifraude na tabela order
ALTER TABLE `order` 
ADD COLUMN `fraudScore` INT NULL COMMENT 'Score de risco 0-100',
ADD COLUMN `fraudReasons` TEXT NULL COMMENT 'Motivos da suspeita (JSON)',
ADD COLUMN `fraudStatus` VARCHAR(50) NULL COMMENT 'pending, approved, rejected, investigating',
ADD COLUMN `fraudCheckedAt` DATETIME NULL COMMENT 'Data da análise manual',
ADD COLUMN `fraudCheckedBy` VARCHAR(255) NULL COMMENT 'ID do admin que analisou',
ADD COLUMN `fraudNotes` TEXT NULL COMMENT 'Observações da análise',
ADD COLUMN `ipAddress` VARCHAR(100) NULL COMMENT 'IP do comprador',
ADD COLUMN `userAgent` TEXT NULL COMMENT 'User agent do navegador';

-- Criar índice para consultas rápidas de pedidos suspeitos
CREATE INDEX idx_fraud_status ON `order`(fraudStatus);
CREATE INDEX idx_fraud_score ON `order`(fraudScore);
