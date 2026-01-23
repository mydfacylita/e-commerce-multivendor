UPDATE `order` SET status = 'DELIVERED' WHERE id = 'BONUS-002';
UPDATE `order` SET status = 'DELIVERED' WHERE id = 'BONUS-COMISSAO-001';
SELECT id, userId, status, total FROM `order` WHERE id IN ('BONUS-002', 'BONUS-COMISSAO-001');
