-- Adicionar campo isSandbox na tabela shopeeauth
-- Permite configurar ambiente de teste (sandbox) vs produção da Shopee

ALTER TABLE `shopeeauth`
  ADD COLUMN `isSandbox` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '0 = Produção, 1 = Sandbox (partner.uat.shopeemobile.com)';
