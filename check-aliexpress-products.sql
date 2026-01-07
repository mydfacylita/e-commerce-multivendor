-- Verificar produtos AliExpress no banco de dados
-- Execute esta query para ver os produtos e seus campos AliExpress

SELECT 
  p.id,
  p.name,
  p.supplierId,
  s.name as supplierName,
  p.supplierSku,
  p.aliexpressProductId,
  p.aliexpressSkuAttr,
  p.price,
  p.stock
FROM Product p
LEFT JOIN Supplier s ON p.supplierId = s.id
WHERE s.name LIKE '%AliExpress%'
ORDER BY p.createdAt DESC;

-- Se não houver produtos com aliexpressProductId preenchido, você precisa:
-- 1. Importar produtos através da integração AliExpress
-- 2. Ou atualizar manualmente com:
--
-- UPDATE Product 
-- SET aliexpressProductId = '1005009511867537',  -- ID real do produto no AliExpress
--     aliexpressSkuAttr = ''                      -- SKU/variação (vazio se produto simples)
-- WHERE id = 'ID_DO_PRODUTO';
