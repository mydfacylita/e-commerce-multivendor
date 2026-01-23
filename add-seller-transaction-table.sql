-- Criar tabela de transações do vendedor para histórico completo
CREATE TABLE IF NOT EXISTS seller_transaction (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(191) NOT NULL,
  type ENUM('CREDIT', 'DEBIT', 'ADJUSTMENT') NOT NULL,
  amount DOUBLE NOT NULL,
  description TEXT NOT NULL,
  reference_type VARCHAR(50),  -- 'ORDER', 'WITHDRAWAL', 'MANUAL', 'EAN_PURCHASE', etc
  reference_id VARCHAR(191),   -- ID do pedido, saque, etc
  previous_balance DOUBLE NOT NULL,
  new_balance DOUBLE NOT NULL,
  created_by VARCHAR(191),     -- ID do admin que criou (se manual)
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  INDEX idx_seller_id (seller_id),
  INDEX idx_type (type),
  INDEX idx_reference (reference_type, reference_id),
  INDEX idx_created_at (created_at),
  
  CONSTRAINT fk_seller_transaction_seller
    FOREIGN KEY (seller_id) REFERENCES seller(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
