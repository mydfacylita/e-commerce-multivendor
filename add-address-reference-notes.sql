-- Adicionar campos reference e notes na tabela address
-- Ponto de referência e observações para entrega

ALTER TABLE `address` 
ADD COLUMN `reference` VARCHAR(255) NULL AFTER `cpf`,
ADD COLUMN `notes` TEXT NULL AFTER `reference`;

-- Verificar se os campos foram adicionados
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'address' 
AND COLUMN_NAME IN ('reference', 'notes');
