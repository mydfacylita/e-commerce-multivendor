-- Criar produtos fictícios para pacotes EAN aparecerem no extrato
INSERT INTO product (id, name, slug, description, price, compareAtPrice, stock, isActive, createdAt, updatedAt, sellerId)
VALUES 
  ('ean-package-free', 'Pacote de Códigos EAN - Gratuito', 'ean-package-free', 'Solicitação de códigos EAN gratuitos', 0, 0, 9999, 1, NOW(), NOW(), 'cmk4hal6j0009cxgjq662ziwc'),
  ('ean-package-paid', 'Compra de Códigos EAN', 'ean-package-paid', 'Compra de pacote de códigos EAN', 0, 0, 9999, 1, NOW(), NOW(), 'cmk4hal6j0009cxgjq662ziwc')
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), 
  description = VALUES(description);

-- Verificar
SELECT id, name, price FROM product WHERE id LIKE 'ean-package%';
