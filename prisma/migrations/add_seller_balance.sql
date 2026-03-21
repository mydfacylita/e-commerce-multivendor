-- Adicionar campo de saldo na tabela seller
ALTER TABLE seller ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0.00;

-- Criar tabela de transações financeiras do vendedor
CREATE TABLE IF NOT EXISTS SellerTransaction (
  id VARCHAR(36) PRIMARY KEY,
  sellerId VARCHAR(36) NOT NULL,
  type ENUM('CREDIT', 'DEBIT') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  reference VARCHAR(100),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sellerId) REFERENCES seller(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
