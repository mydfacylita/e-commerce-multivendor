-- MariaDB dump 10.19  Distrib 10.4.22-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: ecommerce
-- ------------------------------------------------------
-- Server version	10.4.22-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emailVerified` datetime(3) DEFAULT NULL,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('USER','ADMIN','SELLER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `workForSellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employeeRole` enum('MANAGER','OPERATOR','VIEWER') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_key` (`email`),
  KEY `user_workForSellerId_idx` (`workForSellerId`),
  KEY `user_role_idx` (`role`),
  KEY `user_email_role_idx` (`email`,`role`),
  KEY `user_createdAt_idx` (`createdAt`),
  CONSTRAINT `user_workForSellerId_fkey` FOREIGN KEY (`workForSellerId`) REFERENCES `seller` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmk4d6tg000009o4r1appyn9j','Misael Feitoza Ribeiro','misael_ribeiro@hotmail.com',NULL,NULL,'$2a$10$v.pWTXPmc8J.ot7E0CFCOek4J82LjwCs91ZPZ01CFzEcI4dsg/FVi',NULL,'01940069300','ADMIN',NULL,NULL,'2026-01-07 18:41:14.639','2026-01-07 18:41:14.639'),('cmk4d6tj400019o4rfewbqa0v','MARIA SOUSA DIAS DA SILVA','user@example.com',NULL,NULL,'$2a$10$2Sfxobi2ZT/5JfulWdLJN.VunhQcSvrfFgZcTKETVXSGvT/dcEgaW',NULL,NULL,'USER',NULL,NULL,'2026-01-07 18:41:14.752','2026-01-08 01:36:26.705'),('cmk4h7o8l0007cxgj8guv496w','MARCIO GOMES DA COSTA','marcio@gmail.com',NULL,NULL,'$2a$10$IBgvOWoqhdYRn527desZQOARe2Yq.UCZlfDJdV2s/OvPxZt51mixO',NULL,NULL,'SELLER',NULL,NULL,'2026-01-07 20:33:53.013','2026-01-07 20:36:09.027'),('cmk92dqgv00009v2z2y7sd98k','ANTONIO AUGUSTO DIAS','augustodias@gmail.com',NULL,NULL,'$2a$10$te/pgF4LE6S4grKcrm8z5OyFThdfeR3Q2jYvkyab8aIOJqy.HZl5K',NULL,NULL,'USER',NULL,NULL,'2026-01-11 01:37:32.479','2026-01-11 01:37:32.479'),('cmkcodbna00056zcso0o82unf','Antonio Dias da Silva','antonio@gmail.com',NULL,NULL,'$2a$10$v7drN25imk7QG4BxI4mb7eBf2hGbouwKks6twHoLvvTVWSqRmnVea',NULL,NULL,'SELLER','cmk4hal6j0009cxgjq662ziwc','OPERATOR','2026-01-13 14:16:23.349','2026-01-13 14:17:29.336'),('cmkd3qpvm000811uo5hlmeekw','Dynaria Carvalho Ribeiro','dynariaribeiro2020@gmail.com',NULL,NULL,'$2a$12$kel.u8DKJIZOnMz3uMS7xOLJqBtdhtkBX5dBHaAtnZuhBts3mixFC',NULL,NULL,'USER',NULL,NULL,'2026-01-13 21:26:42.561','2026-01-13 21:26:42.561');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-15 20:29:41
