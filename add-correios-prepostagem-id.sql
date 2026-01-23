-- Adicionar campo para guardar o ID da pré-postagem dos Correios
-- Necessário para gerar a etiqueta PDF posteriormente

ALTER TABLE `order` 
ADD COLUMN `correiosIdPrePostagem` VARCHAR(191) NULL AFTER `trackingCode`;

-- Criar índice para buscas
CREATE INDEX `idx_correios_prepostagem` ON `order` (`correiosIdPrePostagem`);
