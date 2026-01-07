-- ============================================
-- LIMPAR DADOS DE PEDIDOS E PRODUTOS
-- Execute com cuidado! Isso apagará TODOS os dados
-- ============================================

-- 1. Deletar itens de pedidos primeiro (FK constraint)
DELETE FROM "OrderItem";

-- 2. Deletar pedidos
DELETE FROM "Order";

-- 3. Deletar variantes de produtos
DELETE FROM "ProductVariant";

-- 4. Deletar produtos
DELETE FROM "Product";

-- 5. Resetar sequences (opcional - para IDs começarem do 1 novamente)
-- ALTER SEQUENCE "Product_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "Order_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "OrderItem_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "ProductVariant_id_seq" RESTART WITH 1;

-- ============================================
-- VERIFICAR LIMPEZA
-- ============================================
SELECT 'Produtos restantes:' as tabela, COUNT(*) as total FROM "Product"
UNION ALL
SELECT 'Pedidos restantes:', COUNT(*) FROM "Order"
UNION ALL
SELECT 'Itens de pedido restantes:', COUNT(*) FROM "OrderItem"
UNION ALL
SELECT 'Variantes restantes:', COUNT(*) FROM "ProductVariant";

-- ============================================
-- IMPORTANTE: 
-- - NÃO deleta usuários, categorias ou fornecedores
-- - Preserva configurações do AliExpress (auth)
-- ============================================
