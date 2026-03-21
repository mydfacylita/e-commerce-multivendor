-- Tabela de Pacotes EAN configuráveis pelo admin
CREATE TABLE IF NOT EXISTS EANPackage (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  type ENUM('OFFICIAL', 'INTERNAL') NOT NULL,
  planId VARCHAR(36),
  active BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  popular BOOLEAN DEFAULT FALSE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME,
  INDEX idx_plan (planId),
  INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir pacotes padrão
INSERT INTO EANPackage (id, name, description, quantity, price, type, active, displayOrder, popular, createdAt) VALUES
(UUID(), 'Interno Básico', 'Códigos internos para uso no marketplace', 10, 0.00, 'INTERNAL', TRUE, 1, FALSE, NOW()),
(UUID(), 'Interno Premium', 'Códigos internos em maior quantidade', 50, 0.00, 'INTERNAL', TRUE, 2, FALSE, NOW()),
(UUID(), 'Oficial Starter', 'Códigos oficiais GS1 para começar', 10, 29.90, 'OFFICIAL', TRUE, 3, FALSE, NOW()),
(UUID(), 'Oficial Business', 'Pacote recomendado para pequenos negócios', 50, 79.90, 'OFFICIAL', TRUE, 4, TRUE, NOW()),
(UUID(), 'Oficial Enterprise', 'Grande quantidade para empresas', 200, 199.90, 'OFFICIAL', TRUE, 5, FALSE, NOW());
