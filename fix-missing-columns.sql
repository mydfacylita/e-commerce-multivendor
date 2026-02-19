-- Adicionar colunas faltantes

-- Coluna para notificação de aguardando envio
ALTER TABLE `order` 
  ADD COLUMN IF NOT EXISTS `awaitingShipmentNotifiedAt` DATETIME(3) NULL AFTER `deliveredNotifiedAt`;

-- Coluna availableAt já deveria existir, mas vamos garantir
ALTER TABLE `affiliate_sale`
  ADD COLUMN IF NOT EXISTS `availableAt` DATETIME(3) NULL AFTER `status`;
