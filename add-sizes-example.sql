-- Exemplo: Adicionar tamanhos a um produto de tênis

-- Primeiro, vamos ver os produtos atuais
SELECT id, name, slug, sizeType, sizeCategory FROM product LIMIT 5;

-- Adicionar tamanhos ao Tênis Nike Air Max (exemplo)
UPDATE product 
SET 
  sizes = JSON_ARRAY(
    JSON_OBJECT('size', '37', 'stock', 5, 'price', 0),
    JSON_OBJECT('size', '38', 'stock', 10, 'price', 0),
    JSON_OBJECT('size', '39', 'stock', 8, 'price', 0),
    JSON_OBJECT('size', '40', 'stock', 12, 'price', 0),
    JSON_OBJECT('size', '41', 'stock', 6, 'price', 0),
    JSON_OBJECT('size', '42', 'stock', 4, 'price', 0),
    JSON_OBJECT('size', '43', 'stock', 3, 'price', 0),
    JSON_OBJECT('size', '44', 'stock', 2, 'price', 0)
  ),
  sizeType = 'adult',
  sizeCategory = 'shoes'
WHERE slug = 'tenis-nike-air-max';

-- Exemplo: Adicionar tamanhos a uma camiseta
UPDATE product 
SET 
  sizes = JSON_ARRAY(
    JSON_OBJECT('size', 'PP', 'stock', 10, 'price', 0),
    JSON_OBJECT('size', 'P', 'stock', 15, 'price', 0),
    JSON_OBJECT('size', 'M', 'stock', 20, 'price', 0),
    JSON_OBJECT('size', 'G', 'stock', 18, 'price', 0),
    JSON_OBJECT('size', 'GG', 'stock', 12, 'price', 0),
    JSON_OBJECT('size', 'XGG', 'stock', 5, 'price', 0)
  ),
  sizeType = 'unisex',
  sizeCategory = 'clothing'
WHERE name LIKE '%Camiseta%' OR name LIKE '%Camisa%';

-- Exemplo: Tênis infantil
UPDATE product 
SET 
  sizes = JSON_ARRAY(
    JSON_OBJECT('size', '20', 'stock', 5, 'price', 0),
    JSON_OBJECT('size', '21', 'stock', 5, 'price', 0),
    JSON_OBJECT('size', '22', 'stock', 6, 'price', 0),
    JSON_OBJECT('size', '23', 'stock', 7, 'price', 0),
    JSON_OBJECT('size', '24', 'stock', 8, 'price', 0),
    JSON_OBJECT('size', '25', 'stock', 6, 'price', 0),
    JSON_OBJECT('size', '26', 'stock', 5, 'price', 0)
  ),
  sizeType = 'children',
  sizeCategory = 'shoes'
WHERE name LIKE '%Tênis Infantil%' OR name LIKE '%Sapato Infantil%';

-- Verificar resultado
SELECT id, name, sizes, sizeType, sizeCategory 
FROM product 
WHERE sizes IS NOT NULL;
