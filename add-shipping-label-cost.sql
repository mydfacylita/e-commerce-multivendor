-- Adicionar campo para custo real da etiqueta de frete
ALTER TABLE `order` ADD COLUMN `shippingLabelCost` FLOAT NULL COMMENT 'Custo real pago pela etiqueta à transportadora';

-- Atualizar pedidos existentes que têm etiqueta mas não têm custo registrado
-- (você pode rodar isso manualmente se necessário)
