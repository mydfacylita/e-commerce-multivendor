-- Migration: Adicionar campos de origem do fornecedor no produto
-- Data: 2026-01-28
-- Descrição: Campos para identificar país de origem do fornecedor AliExpress (BR ou CN)

-- Campos de origem/localização do fornecedor
ALTER TABLE `product` 
  ADD COLUMN `supplierCountryCode` VARCHAR(2) NULL COMMENT 'País do fornecedor (BR, CN, US)' AFTER `supplierStoreName`,
  ADD COLUMN `shipFromCountry` VARCHAR(2) NULL COMMENT 'País de onde o produto é enviado' AFTER `supplierCountryCode`,
  ADD COLUMN `deliveryDays` INT NULL COMMENT 'Prazo de entrega em dias (da API)' AFTER `shipFromCountry`;

-- Índice para filtrar por país de origem
CREATE INDEX `product_supplierCountryCode_idx` ON `product` (`supplierCountryCode`);
CREATE INDEX `product_shipFromCountry_idx` ON `product` (`shipFromCountry`);

-- Visualizar resultado
SELECT 
  'Campos adicionados com sucesso!' as status,
  COUNT(*) as total_produtos
FROM product;
