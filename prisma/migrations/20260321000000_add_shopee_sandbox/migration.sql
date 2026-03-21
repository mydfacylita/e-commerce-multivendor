-- Adicionar campo isSandbox na tabela shopeeauth
-- Permite alternar entre ambiente de teste (sandbox) e producao da Shopee

ALTER TABLE `shopeeauth` ADD COLUMN `isSandbox` BOOLEAN NOT NULL DEFAULT false;
