-- Atualizar telefone e CPF do usuário teste
-- Ajuste o email conforme o usuário que você quer atualizar

UPDATE `User` 
SET 
  `phone` = '98991269315',
  `cpf` = '000.000.000-00'
WHERE `email` = 'teste@example.com';

-- Ou atualizar o primeiro usuário com role USER
UPDATE `User` 
SET 
  `phone` = '98991269315',
  `cpf` = '000.000.000-00'
WHERE `role` = 'USER' 
ORDER BY `createdAt` ASC 
LIMIT 1;

-- Verificar atualização
SELECT id, name, email, phone, cpf, role FROM `User`;
