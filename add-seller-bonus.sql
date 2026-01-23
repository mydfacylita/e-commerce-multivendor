-- Criar depósito manual de R$ 1000 para aparecer no extrato como "Comissão Extra"
USE ecommerce;

-- Inserir pedido fictício
INSERT INTO `order` (id, userId, status, total, createdAt, updatedAt) 
VALUES (
  'BONUS-COMISSAO-001', 
  (SELECT userId FROM seller WHERE id = 'cmk4hal6j0009cxgjq662ziwc'), 
  'COMPLETED', 
  1000, 
  NOW(), 
  NOW()
);

-- Inserir item do pedido com descrição personalizada
INSERT INTO orderitem (
  id, 
  orderId, 
  productId, 
  sellerId, 
  quantity, 
  price, 
  sellerRevenue, 
  itemType, 
  createdAt
) VALUES (
  UUID(), 
  'BONUS-COMISSAO-001', 
  (SELECT id FROM product LIMIT 1), 
  'cmk4hal6j0009cxgjq662ziwc', 
  1, 
  1000, 
  1000, 
  'STOCK', 
  NOW()
);

-- Verificar saldo atualizado
SELECT 
  storeName,
  CONCAT('R$ ', FORMAT(balance, 2, 'pt_BR')) as saldo,
  CONCAT('R$ ', FORMAT(totalEarned, 2, 'pt_BR')) as total_ganho
FROM seller 
WHERE id = 'cmk4hal6j0009cxgjq662ziwc';
