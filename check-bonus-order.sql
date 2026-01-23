-- Verificar se o order BONUS-002 existe
SELECT id, userId, status, total FROM `order` WHERE id = 'BONUS-002';

-- Ver todos os orderitems do vendedor com info do order
SELECT 
    oi.id, 
    oi.orderId, 
    o.status as orderStatus,
    oi.sellerRevenue, 
    oi.createdAt,
    p.name as productName
FROM orderitem oi 
LEFT JOIN `order` o ON oi.orderId = o.id 
LEFT JOIN product p ON oi.productId = p.id
WHERE oi.sellerId = 'cmk4hal6j0009cxgjq662ziwc' 
ORDER BY oi.createdAt DESC 
LIMIT 10;
