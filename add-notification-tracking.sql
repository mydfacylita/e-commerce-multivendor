-- Adicionar campos para rastrear notificações enviadas
-- Isso evita enviar o mesmo email múltiplas vezes

ALTER TABLE `order`
ADD COLUMN `awaitingShipmentNotifiedAt` DATETIME NULL COMMENT 'Data/hora do email aguardando envio',
ADD COLUMN `deliveryNotifiedAt` DATETIME NULL COMMENT 'Data/hora do email de entrega',
ADD COLUMN `notificationsSent` JSON NULL COMMENT 'Histórico de notificações enviadas';

-- Adicionar índices para performance
CREATE INDEX idx_awaiting_shipment_notified ON `order`(`awaitingShipmentNotifiedAt`);
CREATE INDEX idx_delivery_notified ON `order`(`deliveryNotifiedAt`);

-- Criar tabela para histórico de notificações de carrinho abandonado
CREATE TABLE IF NOT EXISTS `cart_notification` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` VARCHAR(50) NOT NULL COMMENT 'Tipo: cart_abandoned, cart_reminder_1, cart_reminder_2',
  `sentAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `emailSent` BOOLEAN NOT NULL DEFAULT TRUE,
  `whatsappSent` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`id`),
  INDEX `idx_user_type` (`userId`, `type`),
  INDEX `idx_sent_at` (`sentAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
