-- Adicionar campo availableAt na tabela affiliate_sale
-- Este campo armazena a data em que a comissão fica disponível para saque (7 dias após entrega)

ALTER TABLE `affiliate_sale`
ADD COLUMN `availableAt` DATETIME NULL AFTER `status`;

-- Adicionar índice para consultas rápidas de comissões disponíveis
ALTER TABLE `affiliate_sale`
ADD INDEX `idx_availableAt` (`availableAt`);

-- Para vendas já confirmadas, definir data de disponibilidade baseada na data de criação
UPDATE `affiliate_sale`
SET `availableAt` = DATE_ADD(createdAt, INTERVAL 7 DAY)
WHERE `status` = 'CONFIRMED' AND `availableAt` IS NULL;

-- Comentário sobre o campo
ALTER TABLE `affiliate_sale` 
MODIFY COLUMN `availableAt` DATETIME NULL 
COMMENT 'Data em que a comissão fica disponível para saque (7 dias após entrega)';
