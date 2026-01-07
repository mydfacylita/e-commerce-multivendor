-- 1. Verificar produtos AliExpress e seus IDs
SELECT 
  id,
  name,
  slug,
  aliexpressProductId,
  aliexpressSkuAttr,
  supplierSku
FROM Product
WHERE supplierId IN (SELECT id FROM Supplier WHERE name LIKE '%AliExpress%')
ORDER BY createdAt DESC;

-- 2. Se o aliexpressProductId estiver errado, extrair do slug:
-- Slug formato: 1005008670281338-1767651466993
-- Product ID: 1005008670281338 (primeira parte antes do hífen)

-- 3. Corrigir produtos com ID errado (rode depois de verificar o SELECT acima):
/*
UPDATE Product
SET aliexpressProductId = SUBSTRING_INDEX(slug, '-', 1)
WHERE supplierId IN (SELECT id FROM Supplier WHERE name LIKE '%AliExpress%')
  AND (aliexpressProductId IS NULL 
       OR aliexpressProductId != SUBSTRING_INDEX(slug, '-', 1));
*/

-- 4. Verificar novamente após a correção:
/*
SELECT 
  id,
  name,
  slug,
  aliexpressProductId,
  SUBSTRING_INDEX(slug, '-', 1) as extracted_id,
  CASE 
    WHEN aliexpressProductId = SUBSTRING_INDEX(slug, '-', 1) THEN '✅ Correto'
    ELSE '❌ Divergente'
  END as status
FROM Product
WHERE supplierId IN (SELECT id FROM Supplier WHERE name LIKE '%AliExpress%');
*/
