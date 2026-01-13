-- INVESTIGAÇÃO PEDIDO #cmk632je

-- 1. BUSCAR O PEDIDO
SELECT 
  o.*
FROM `order` o
WHERE o.id = 'cmk632je';

-- 2. BUSCAR ITENS DO PEDIDO
SELECT 
  oi.*,
  p.name as product_name,
  p.price as product_price,
  p.costPrice as product_costPrice
FROM orderitem oi
INNER JOIN product p ON oi.productId = p.id
WHERE oi.orderId = 'cmk632je';

-- 3. BUSCAR VENDEDOR DOS ITENS (se houver)
SELECT DISTINCT
  s.id,
  s.businessName,
  s.balance,
  s.totalEarned,
  s.totalWithdrawn,
  u.name as user_name,
  u.email as user_email
FROM orderitem oi
INNER JOIN seller s ON oi.sellerId = s.id
INNER JOIN user u ON s.userId = u.id
WHERE oi.orderId = 'cmk632je';

-- 4. BUSCAR TODOS OS PAGAMENTOS DROP PENDENTES DO VENDEDOR
SELECT 
  oi.id as orderitem_id,
  oi.orderId,
  o.status as order_status,
  p.name as product_name,
  oi.itemType,
  oi.supplierCost,
  oi.sellerRevenue,
  oi.commissionRate,
  o.createdAt
FROM orderitem oi
INNER JOIN `order` o ON oi.orderId = o.id
INNER JOIN product p ON oi.productId = p.id
WHERE oi.sellerId IN (
  SELECT DISTINCT sellerId 
  FROM orderitem 
  WHERE orderId = 'cmk632je' AND sellerId IS NOT NULL
)
AND oi.itemType = 'DROPSHIPPING'
AND o.status IN ('PROCESSING', 'SHIPPED', 'DELIVERED')
ORDER BY o.createdAt DESC;
