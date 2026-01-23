-- Corrigir status do order BONUS-002 e BONUS-COMISSAO-001
UPDATE `order` SET status = 'DELIVERED' WHERE id IN ('BONUS-002', 'BONUS-COMISSAO-001');

-- Verificar
SELECT id, userId, status, total FROM `order` WHERE id IN ('BONUS-002', 'BONUS-COMISSAO-001');
