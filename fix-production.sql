-- Fix production: columns without IF NOT EXISTS (MySQL 8.0 compatible)

-- company_branch NFe columns
ALTER TABLE company_branch ADD COLUMN nfSerie VARCHAR(10) NULL;
ALTER TABLE company_branch ADD COLUMN nfAmbiente VARCHAR(20) NULL;
ALTER TABLE company_branch ADD COLUMN nfNaturezaOperacao VARCHAR(255) NULL;
ALTER TABLE company_branch ADD COLUMN nfCrt VARCHAR(2) NULL;
ALTER TABLE company_branch ADD COLUMN nfCertificadoArquivo VARCHAR(500) NULL;
ALTER TABLE company_branch ADD COLUMN nfCertificadoSenha TEXT NULL;
ALTER TABLE company_branch ADD COLUMN nfCertificadoValidade DATETIME NULL;
ALTER TABLE company_branch ADD COLUMN nfTaxRulesJson LONGTEXT NULL;

-- order warehouse filter
ALTER TABLE `order` ADD COLUMN warehouseCode VARCHAR(100) NULL;
ALTER TABLE `order` ADD INDEX idx_warehouse_code (warehouseCode);

-- developer_app filter config
ALTER TABLE developer_app ADD COLUMN filterConfig JSON NULL;

-- default tax rules (systemconfig = table name in production)
INSERT IGNORE INTO systemconfig (`key`, `value`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('tax.defaultCfop', '5102', 'CFOP padrão para vendas', NOW(), NOW()),
  ('tax.defaultCst', '400', 'CST padrão para produtos', NOW(), NOW()),
  ('tax.defaultCsosn', '400', 'CSOSN padrão para Simples Nacional', NOW(), NOW()),
  ('tax.defaultAliqIcms', '12', 'Alíquota padrão ICMS (%)', NOW(), NOW()),
  ('tax.defaultAliqPis', '0.65', 'Alíquota padrão PIS (%)', NOW(), NOW()),
  ('tax.defaultAliqCofins', '3', 'Alíquota padrão COFINS (%)', NOW(), NOW());
