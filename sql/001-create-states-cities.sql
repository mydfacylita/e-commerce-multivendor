-- Tabela de Estados do Brasil
CREATE TABLE IF NOT EXISTS `states` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `uf` CHAR(2) NOT NULL,
  `ibgeCode` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uf` (`uf`),
  UNIQUE KEY `uk_ibge` (`ibgeCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabela de Cidades do Brasil
CREATE TABLE IF NOT EXISTS `cities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `stateId` INT NOT NULL,
  `ibgeCode` INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ibge` (`ibgeCode`),
  KEY `idx_state` (`stateId`),
  KEY `idx_name` (`name`),
  CONSTRAINT `fk_city_state` FOREIGN KEY (`stateId`) REFERENCES `states` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inserir Estados
INSERT INTO `states` (`name`, `uf`, `ibgeCode`) VALUES
('Acre', 'AC', 12),
('Alagoas', 'AL', 27),
('Amapá', 'AP', 16),
('Amazonas', 'AM', 13),
('Bahia', 'BA', 29),
('Ceará', 'CE', 23),
('Distrito Federal', 'DF', 53),
('Espírito Santo', 'ES', 32),
('Goiás', 'GO', 52),
('Maranhão', 'MA', 21),
('Mato Grosso', 'MT', 51),
('Mato Grosso do Sul', 'MS', 50),
('Minas Gerais', 'MG', 31),
('Pará', 'PA', 15),
('Paraíba', 'PB', 25),
('Paraná', 'PR', 41),
('Pernambuco', 'PE', 26),
('Piauí', 'PI', 22),
('Rio de Janeiro', 'RJ', 33),
('Rio Grande do Norte', 'RN', 24),
('Rio Grande do Sul', 'RS', 43),
('Rondônia', 'RO', 11),
('Roraima', 'RR', 14),
('Santa Catarina', 'SC', 42),
('São Paulo', 'SP', 35),
('Sergipe', 'SE', 28),
('Tocantins', 'TO', 17);
