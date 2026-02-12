-- Adicionar campo convertedAt na tabela affiliate_click
ALTER TABLE affiliate_click 
ADD COLUMN convertedAt DATETIME(3) NULL AFTER converted;

-- Criar índice para melhor performance
CREATE INDEX idx_affiliate_click_converted ON affiliate_click(affiliateId, converted, convertedAt);

-- Verificar estrutura
DESCRIBE affiliate_click;
