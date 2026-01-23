-- Tabela de Eventos de Nota Fiscal
-- Armazena histórico de eventos: emissão, cancelamento, carta de correção, etc.

CREATE TABLE IF NOT EXISTS invoice_event (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  invoice_id VARCHAR(255) NOT NULL,
  type ENUM('EMISSAO', 'AUTORIZACAO', 'CANCELAMENTO', 'CCE', 'INUTILIZACAO', 'CONSULTA', 'ERRO') NOT NULL,
  description TEXT,
  protocol VARCHAR(50),
  seq_evento INT DEFAULT 1,
  xml_url VARCHAR(500),
  xml_content LONGTEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  
  INDEX idx_invoice_event_invoice_id (invoice_id),
  INDEX idx_invoice_event_type (type),
  INDEX idx_invoice_event_created_at (created_at)
);

-- Comentários explicativos
-- type: Tipo do evento fiscal
--   EMISSAO: Geração inicial da NF-e
--   AUTORIZACAO: Autorização pela SEFAZ
--   CANCELAMENTO: Evento 110111 - Cancelamento
--   CCE: Evento 110110 - Carta de Correção Eletrônica
--   INUTILIZACAO: Inutilização de numeração
--   CONSULTA: Consulta de situação
--   ERRO: Registro de erro

-- seq_evento: Sequência do evento (usado na CC-e que pode ter múltiplos eventos)
-- xml_content: XML do evento assinado (opcional, para backup)
