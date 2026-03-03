-- Mês do Consumidor: campos de modal promocional nos cupons
ALTER TABLE `coupon`
  ADD COLUMN `showInModal` TINYINT(1) NOT NULL DEFAULT 0 AFTER `firstPurchaseOnly`,
  ADD COLUMN `promoImage` LONGTEXT NULL AFTER `showInModal`;
