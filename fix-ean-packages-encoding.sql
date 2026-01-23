-- Corrigir encoding dos pacotes EAN
USE ecommerce;

-- Atualizar todos os pacotes com acentuação correta
UPDATE EANPackage SET 
  name = 'Interno Básico',
  description = 'Códigos internos para uso no marketplace'
WHERE id = '99c29b13-f308-11f0-b2b2-8cb0e930e594';

UPDATE EANPackage SET 
  description = 'Códigos internos em maior quantidade'
WHERE id = '99c2a3d1-f308-11f0-b2b2-8cb0e930e594';

UPDATE EANPackage SET 
  description = 'Códigos oficiais GS1 para começar'
WHERE id = '99c2a4d3-f308-11f0-b2b2-8cb0e930e594';

UPDATE EANPackage SET 
  description = 'Pacote recomendado para pequenos negócios'
WHERE id = '99c2a520-f308-11f0-b2b2-8cb0e930e594';

UPDATE EANPackage SET 
  name = 'EAN Básico',
  description = 'Plano de EAN para poucos produtos'
WHERE id = '874b814e-8f29-4078-8182-7fdf6b9b4fd1';
