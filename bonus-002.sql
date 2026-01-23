-- Bônus de Comissão Extra
INSERT INTO `order` (id, userId, status, total, createdAt, updatedAt)
SELECT 'BONUS-002', userId, 'COMPLETED', 1000, NOW(), NOW() 
FROM seller WHERE id = 'cmk4hal6j0009cxgjq662ziwc';

INSERT INTO orderitem (id, orderId, productId, sellerId, quantity, price, sellerRevenue, itemType, createdAt)
SELECT UUID(), 'BONUS-002', (SELECT id FROM product LIMIT 1), 'cmk4hal6j0009cxgjq662ziwc', 1, 1000, 1000, 'STOCK', NOW();
