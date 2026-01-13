UPDATE product 
SET sizes = '[{"size":"37","stock":5},{"size":"38","stock":10},{"size":"39","stock":8},{"size":"40","stock":12},{"size":"41","stock":6},{"size":"42","stock":4},{"size":"43","stock":3},{"size":"44","stock":2}]',
    sizeType = 'adult',
    sizeCategory = 'shoes'
WHERE slug = 'tenis-nike-air-max';

SELECT id, name, sizes, sizeType, sizeCategory FROM product WHERE slug = 'tenis-nike-air-max';
