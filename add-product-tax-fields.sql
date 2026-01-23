-- Adicionar campos de tributação em cada produto
-- Executar: mysql -u root -p ecommerce < add-product-tax-fields.sql

ALTER TABLE product
  ADD COLUMN ncm VARCHAR(10) NULL COMMENT 'NCM do produto (8 dígitos)' AFTER gtin,
  ADD COLUMN cest VARCHAR(10) NULL COMMENT 'CEST do produto (7 dígitos)' AFTER ncm,
  ADD COLUMN origem VARCHAR(1) DEFAULT '0' COMMENT 'Origem: 0=Nacional, 1-7=Importado' AFTER cest,
  ADD COLUMN cst_icms VARCHAR(3) NULL COMMENT 'CST ICMS específico (sobrescreve regra)' AFTER origem,
  ADD COLUMN aliquota_icms DECIMAL(5,2) NULL COMMENT 'Alíquota ICMS específica (sobrescreve regra)' AFTER cst_icms,
  ADD COLUMN reducao_bc_icms DECIMAL(5,2) NULL COMMENT '% Redução base cálculo ICMS' AFTER aliquota_icms,
  ADD COLUMN cst_pis VARCHAR(2) NULL COMMENT 'CST PIS específico' AFTER reducao_bc_icms,
  ADD COLUMN aliquota_pis DECIMAL(5,2) NULL COMMENT 'Alíquota PIS específica' AFTER cst_pis,
  ADD COLUMN cst_cofins VARCHAR(2) NULL COMMENT 'CST COFINS específico' AFTER aliquota_pis,
  ADD COLUMN aliquota_cofins DECIMAL(5,2) NULL COMMENT 'Alíquota COFINS específica' AFTER cst_cofins,
  ADD COLUMN cfop_interno VARCHAR(4) NULL COMMENT 'CFOP específico para venda interna' AFTER aliquota_cofins,
  ADD COLUMN cfop_interestadual VARCHAR(4) NULL COMMENT 'CFOP específico para venda interestadual' AFTER cfop_interno,
  ADD COLUMN unidade_comercial VARCHAR(6) DEFAULT 'UN' COMMENT 'Unidade comercial (UN, KG, L, etc)' AFTER cfop_interestadual,
  ADD COLUMN unidade_tributavel VARCHAR(6) DEFAULT 'UN' COMMENT 'Unidade tributável' AFTER unidade_comercial,
  ADD COLUMN tributacao_especial ENUM('normal', 'monofasico', 'st', 'isento', 'imune') DEFAULT 'normal' COMMENT 'Tipo de tributação especial' AFTER unidade_tributavel;

-- Índice para busca por NCM
CREATE INDEX idx_product_ncm ON product(ncm);

-- Índice para tributação especial
CREATE INDEX idx_product_tributacao ON product(tributacao_especial);

SELECT 'Campos de tributação adicionados com sucesso!' as resultado;
