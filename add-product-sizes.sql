-- Adicionar campos de tamanhos/numerações para produtos
ALTER TABLE `ecommerce`.`product` 
ADD COLUMN `sizes` TEXT NULL COMMENT 'JSON array com tamanhos disponíveis' AFTER `attributes`,
ADD COLUMN `sizeType` VARCHAR(50) NULL COMMENT 'Tipo: adult, children, baby, unisex, etc' AFTER `sizes`,
ADD COLUMN `sizeCategory` VARCHAR(50) NULL COMMENT 'Categoria: shoes, clothing, accessories, etc' AFTER `sizeType`;
