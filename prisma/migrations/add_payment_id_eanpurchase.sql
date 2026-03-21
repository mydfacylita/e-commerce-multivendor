-- Adicionar campo paymentId na tabela EANPurchase para rastrear pagamentos
ALTER TABLE EANPurchase 
ADD COLUMN paymentId VARCHAR(191) NULL AFTER price;

-- Índice para busca rápida por paymentId
CREATE INDEX idx_eanpurchase_paymentid ON EANPurchase(paymentId);
