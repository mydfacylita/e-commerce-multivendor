-- Adicionar campos phone e cpf no User
ALTER TABLE `User` ADD COLUMN `phone` VARCHAR(20) NULL AFTER `password`;
ALTER TABLE `User` ADD COLUMN `cpf` VARCHAR(14) NULL AFTER `phone`;

-- Atualizar telefone do usuário teste (ajuste o email conforme necessário)
UPDATE `User` SET `phone` = '98991269315' WHERE `email` = 'teste@example.com' OR `role` = 'USER' LIMIT 1;
