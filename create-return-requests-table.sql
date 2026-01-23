-- Criação da tabela de solicitações de devolução
-- Data: 2025-01-14
-- Descrição: Tabela para gerenciar solicitações de devolução de produtos

CREATE TABLE IF NOT EXISTS "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemIds" TEXT[] NOT NULL, -- Array de IDs dos itens a serem devolvidos
    "reason" TEXT NOT NULL, -- Motivo da devolução (enum)
    "description" TEXT, -- Descrição adicional (opcional)
    "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, COMPLETED
    "adminNotes" TEXT, -- Observações do administrador
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3), -- Data de revisão pelo admin
    "reviewedBy" TEXT, -- ID do admin que revisou
    "completedAt" TIMESTAMP(3), -- Data de conclusão da devolução
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- Adicionar foreign keys
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Criar índices para performance
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");
CREATE INDEX "ReturnRequest_requestedAt_idx" ON "ReturnRequest"("requestedAt");

-- Comentários para documentação
COMMENT ON TABLE "ReturnRequest" IS 'Tabela para gerenciar solicitações de devolução de produtos';
COMMENT ON COLUMN "ReturnRequest"."itemIds" IS 'Array com os IDs dos itens OrderItem a serem devolvidos';
COMMENT ON COLUMN "ReturnRequest"."reason" IS 'Motivo: PRODUTO_DANIFICADO, PRODUTO_INCORRETO, NAO_ATENDE_EXPECTATIVA, DEFEITO_FABRICACAO, ARREPENDIMENTO, OUTRO';
COMMENT ON COLUMN "ReturnRequest"."status" IS 'Status: PENDING (aguardando análise), APPROVED (aprovada), REJECTED (rejeitada), COMPLETED (devolução concluída)';
COMMENT ON COLUMN "ReturnRequest"."adminNotes" IS 'Observações internas do administrador sobre a solicitação';