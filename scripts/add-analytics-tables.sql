-- ============================================
-- Script para adicionar tabelas de analytics
-- Execute manualmente no phpMyAdmin ou MySQL CLI
-- ============================================

USE ecommerce;

-- Tabela de analytics
CREATE TABLE IF NOT EXISTS `analytics_table` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `data` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices para performance
CREATE INDEX IF NOT EXISTS `analytics_table_name_idx` ON `analytics_table`(`name`);
CREATE INDEX IF NOT EXISTS `analytics_table_createdAt_idx` ON `analytics_table`(`createdAt`);

-- ============================================
-- Script executado com sucesso!
-- Agora execute: npx prisma generate
-- ============================================
