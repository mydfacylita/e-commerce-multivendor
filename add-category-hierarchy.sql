-- Adicionar coluna parentId para hierarquia de categorias
ALTER TABLE `category` 
ADD COLUMN `parentId` VARCHAR(191) NULL AFTER `image`,
ADD INDEX `category_parentId_idx` (`parentId`),
ADD CONSTRAINT `category_parentId_fkey` 
  FOREIGN KEY (`parentId`) 
  REFERENCES `category`(`id`) 
  ON DELETE NO ACTION 
  ON UPDATE NO ACTION;

-- Exemplos de categorias hierárquicas (opcional - comentar se não quiser)
-- Vestuário (categoria pai)
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES ('cat_vestuario', 'Vestuário', 'vestuario', 'Roupas e acessórios', NULL)
ON DUPLICATE KEY UPDATE name=name;

-- Subcategorias de Vestuário
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES 
  ('cat_roupas_femininas', 'Roupas Femininas', 'roupas-femininas', 'Moda feminina', 'cat_vestuario'),
  ('cat_roupas_masculinas', 'Roupas Masculinas', 'roupas-masculinas', 'Moda masculina', 'cat_vestuario'),
  ('cat_roupas_infantis', 'Roupas Infantis', 'roupas-infantis', 'Moda infantil', 'cat_vestuario')
ON DUPLICATE KEY UPDATE name=name;

-- Calçados (categoria pai)
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES ('cat_calcados', 'Calçados', 'calcados', 'Sapatos e tênis', NULL)
ON DUPLICATE KEY UPDATE name=name;

-- Subcategorias de Calçados
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES 
  ('cat_calcados_femininos', 'Calçados Femininos', 'calcados-femininos', 'Sapatos femininos', 'cat_calcados'),
  ('cat_calcados_masculinos', 'Calçados Masculinos', 'calcados-masculinos', 'Sapatos masculinos', 'cat_calcados'),
  ('cat_calcados_infantis', 'Calçados Infantis', 'calcados-infantis', 'Sapatos infantis', 'cat_calcados')
ON DUPLICATE KEY UPDATE name=name;

-- Eletrônicos (categoria pai)
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES ('cat_eletronicos', 'Eletrônicos', 'eletronicos', 'Produtos eletrônicos', NULL)
ON DUPLICATE KEY UPDATE name=name;

-- Subcategorias de Eletrônicos
INSERT INTO `category` (`id`, `name`, `slug`, `description`, `parentId`) 
VALUES 
  ('cat_smartphones', 'Smartphones', 'smartphones', 'Celulares e smartphones', 'cat_eletronicos'),
  ('cat_notebooks', 'Notebooks', 'notebooks', 'Computadores portáteis', 'cat_eletronicos'),
  ('cat_acessorios_eletronicos', 'Acessórios', 'acessorios-eletronicos', 'Acessórios eletrônicos', 'cat_eletronicos')
ON DUPLICATE KEY UPDATE name=name;
