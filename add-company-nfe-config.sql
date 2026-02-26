-- Adiciona campos de configuração NF-e em cada filial/galpão
-- Executar: mysql -u root ecommerce < add-company-nfe-config.sql

ALTER TABLE company_branch
  ADD COLUMN IF NOT EXISTS nfSerie              VARCHAR(10)  NULL AFTER isActive,
  ADD COLUMN IF NOT EXISTS nfAmbiente           VARCHAR(20)  NULL AFTER nfSerie,
  ADD COLUMN IF NOT EXISTS nfNaturezaOperacao   VARCHAR(255) NULL AFTER nfAmbiente,
  ADD COLUMN IF NOT EXISTS nfCrt                VARCHAR(2)   NULL AFTER nfNaturezaOperacao,
  ADD COLUMN IF NOT EXISTS nfCertificadoArquivo VARCHAR(500) NULL AFTER nfCrt,
  ADD COLUMN IF NOT EXISTS nfCertificadoSenha   TEXT         NULL AFTER nfCertificadoArquivo,
  ADD COLUMN IF NOT EXISTS nfCertificadoValidade DATETIME    NULL AFTER nfCertificadoSenha,
  ADD COLUMN IF NOT EXISTS nfTaxRulesJson       LONGTEXT     NULL AFTER nfCertificadoValidade;
