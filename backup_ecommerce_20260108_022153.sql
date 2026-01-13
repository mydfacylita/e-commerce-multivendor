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
-- Table structure for table `aliexpressauth`
--

DROP TABLE IF EXISTS `aliexpressauth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `aliexpressauth` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `appSecret` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiresAt` datetime(3) DEFAULT NULL,
  `trackingId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `aliexpressauth_userId_key` (`userId`),
  CONSTRAINT `aliexpressauth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aliexpressauth`
--

LOCK TABLES `aliexpressauth` WRITE;
/*!40000 ALTER TABLE `aliexpressauth` DISABLE KEYS */;
/*!40000 ALTER TABLE `aliexpressauth` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cartitem`
--

DROP TABLE IF EXISTS `cartitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cartitem` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cartitem_userId_productId_key` (`userId`,`productId`),
  KEY `cartitem_productId_idx` (`productId`),
  CONSTRAINT `cartitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cartitem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cartitem`
--

LOCK TABLES `cartitem` WRITE;
/*!40000 ALTER TABLE `cartitem` DISABLE KEYS */;
/*!40000 ALTER TABLE `cartitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `category` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES ('cmk4d6tjk00049o4r607nfnwa','Eletrônicos','eletronicos','Produtos eletrônicos e tecnologia de ponta','https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400','2026-01-07 18:41:14.768','2026-01-07 18:41:14.768'),('cmk4d6tjo00059o4r4itychtl','Moda','moda','Roupas e acessórios para todos os estilos','https://images.unsplash.com/photo-1445205170230-053b83016050?w=400','2026-01-07 18:41:14.772','2026-01-07 18:41:14.772'),('cmk4d6tjr00069o4rp539eypv','Livros','livros','Livros de diversos gêneros e autores','https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400','2026-01-07 18:41:14.775','2026-01-07 18:41:14.775'),('cmk4d6tjx00079o4r3qjoobzk','Casa e Decoração','casa-decoracao','Itens para deixar sua casa ainda mais bonita','https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400','2026-01-07 18:41:14.781','2026-01-07 18:41:14.781'),('cmk4d6tk100089o4rslhi3dyl','Esportes','esportes','Equipamentos e roupas para prática esportiva','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400','2026-01-07 18:41:14.786','2026-01-07 18:41:14.786'),('cmk4ei4sw00046utajyfb4j4b','Saúde','saude','Produtos de Saúde','https://wordpress-cms-revista-prod-assets.quero.space/legacy_posts/post_images/32018/7b3c5bb401da576bd640addf39e16073920e351e.jpg?1603218870','2026-01-07 19:18:02.191','2026-01-07 19:18:02.191');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `company_settings` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cnpj` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `defaultCommission` double DEFAULT 10,
  `processingDays` int(11) DEFAULT 2,
  `showRealTimeStock` tinyint(1) NOT NULL DEFAULT 1,
  `autoApproveSellers` tinyint(1) NOT NULL DEFAULT 0,
  `notifyNewDropshippingProducts` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_settings`
--

LOCK TABLES `company_settings` WRITE;
/*!40000 ALTER TABLE `company_settings` DISABLE KEYS */;
INSERT INTO `company_settings` VALUES ('cmk4lsw1d0000oc3dbqm2hqke','MYD Facilyta Tecnology','2422386800019','mydfacilyta@gmail.com','98991269315','AV DOS HOLANDESES Nº 15',16,2,1,0,1,'2026-01-07 22:42:21.360','2026-01-07 22:43:43.078');
/*!40000 ALTER TABLE `company_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marketplacelisting`
--

DROP TABLE IF EXISTS `marketplacelisting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `marketplacelisting` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marketplace` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `listingId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` double DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  `listingUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastSyncAt` datetime(3) DEFAULT NULL,
  `syncEnabled` tinyint(1) NOT NULL DEFAULT 1,
  `errorMessage` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketplacelisting_productId_marketplace_key` (`productId`,`marketplace`),
  KEY `marketplacelisting_marketplace_idx` (`marketplace`),
  KEY `marketplacelisting_status_idx` (`status`),
  CONSTRAINT `marketplacelisting_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marketplacelisting`
--

LOCK TABLES `marketplacelisting` WRITE;
/*!40000 ALTER TABLE `marketplacelisting` DISABLE KEYS */;
INSERT INTO `marketplacelisting` VALUES ('cmk4gsgtr0004cxgjb7dfb7ln','cmk4d6tl0000k9o4r0hctsqlb','mercadolivre','MLB4407199873','active','Livro: Clean Code',89.99,50,'http://produto.mercadolivre.com.br/MLB-4407199873-livro-clean-code-_JM','2026-01-07 20:25:51.329',1,NULL,'2026-01-07 20:22:03.566','2026-01-07 20:25:51.330'),('cmk4gveu40006cxgj80fksd43','cmk4d6tla000o9o4rcu8h5147','mercadolivre','MLB6144561792','under_review','Smart Watch Series 7',129.3,158,'http://produto.mercadolivre.com.br/MLB-6144561792-smart-watch-series-7-_JM','2026-01-07 20:24:20.954',1,NULL,'2026-01-07 20:24:20.956','2026-01-07 20:26:09.220');
/*!40000 ALTER TABLE `marketplacelisting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mercadolivreauth`
--

DROP TABLE IF EXISTS `mercadolivreauth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mercadolivreauth` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `mlUserId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mercadolivreauth_userId_key` (`userId`),
  CONSTRAINT `mercadolivreauth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mercadolivreauth`
--

LOCK TABLES `mercadolivreauth` WRITE;
/*!40000 ALTER TABLE `mercadolivreauth` DISABLE KEYS */;
INSERT INTO `mercadolivreauth` VALUES ('cmk4dzcf900016uta42p2yhki','cmk4d6tg000009o4r1appyn9j','APP_USR-5825798301055921-010715-29aa3c25b602c051709718ea17ccaca1-397450798','TG-695eada1520d6100019371af-397450798','2026-01-08 01:03:25.596','397450798','2026-01-07 19:03:25.604','2026-01-07 19:03:25.604');
/*!40000 ALTER TABLE `mercadolivreauth` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mercadolivrecredentials`
--

DROP TABLE IF EXISTS `mercadolivrecredentials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mercadolivrecredentials` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientSecret` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mercadolivrecredentials`
--

LOCK TABLES `mercadolivrecredentials` WRITE;
/*!40000 ALTER TABLE `mercadolivrecredentials` DISABLE KEYS */;
INSERT INTO `mercadolivrecredentials` VALUES ('default','5825798301055921','OiMWA25UMQzX5945to2uiNnX5UgNcnxg','2026-01-07 18:45:48.927','2026-01-07 18:45:48.927');
/*!40000 ALTER TABLE `mercadolivrecredentials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order`
--

DROP TABLE IF EXISTS `order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `order` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `total` double NOT NULL,
  `profit` double DEFAULT NULL,
  `shippingAddress` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `paymentIntentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trackingCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marketplaceName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marketplaceOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sentToSupplier` tinyint(1) NOT NULL DEFAULT 0,
  `sentToSupplierAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `buyerEmail` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyerName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyerPhone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyerCpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentMethod` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shippingCost` double DEFAULT NULL,
  `buyerMessages` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelReason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commissionAmount` double DEFAULT NULL,
  `commissionRate` double DEFAULT NULL,
  `sellerRevenue` double DEFAULT NULL,
  `soldBySellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentApprovedAt` datetime(3) DEFAULT NULL,
  `paymentDetails` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paymentDetails`)),
  `paymentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentStatus` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paymentType` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_marketplaceOrderId_key` (`marketplaceOrderId`),
  KEY `order_userId_idx` (`userId`),
  KEY `order_sellerId_idx` (`sellerId`),
  KEY `order_soldBySellerId_idx` (`soldBySellerId`),
  CONSTRAINT `order_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `seller` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_soldBySellerId_fkey` FOREIGN KEY (`soldBySellerId`) REFERENCES `seller` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `order_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order`
--

LOCK TABLES `order` WRITE;
/*!40000 ALTER TABLE `order` DISABLE KEYS */;
INSERT INTO `order` VALUES ('cmk4mxbra0007g8ihs3903kvg','cmk4h7o8l0007cxgj8guv496w','PROCESSING',690,NULL,'RUA DO RETIRO, SN, COND GRAN VILAGY ELDORADO BL 04 APT 102, CEP 65067-380, SAO LUIS, Maranhão - 65066320',NULL,NULL,NULL,NULL,NULL,0,NULL,'2026-01-07 23:13:47.974','2026-01-07 23:33:22.170','marcio@gmail.com','MARCIO GOMES DA COSTA','98988489512','01940069300',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('cmk4og0l1000cg8ihry3f6k4k','cmk4h7o8l0007cxgj8guv496w','PENDING',599.99,NULL,'RUA DO RETIRO, SN, COND GRAN VILAGY ELDORADO BL 04 APT 102, CEP 65067-380, SAO LUIS, Maranhão - 65066320',NULL,NULL,NULL,NULL,NULL,0,NULL,'2026-01-07 23:56:19.572','2026-01-07 23:56:19.572','marcio@gmail.com','MARCIO GOMES DA COSTA','98988489512','01940069300',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),('cmk4rtf07000112p381m1rc78','cmk4d6tj400019o4rfewbqa0v','CANCELLED',1,NULL,'RUA DO RETIRO, SN, COND GRAN VILAGY ELDORADO BL 04 APT 102, CEP 65067-380, SAO LUIS, Maranhão - 65066320',NULL,NULL,NULL,NULL,NULL,0,NULL,'2026-01-08 01:30:43.637','2026-01-08 03:21:39.334','user@example.com','Usuário Teste','98988489512','01940069300',NULL,NULL,NULL,'Estorno de pagamento duplicado',NULL,NULL,NULL,NULL,NULL,'2026-01-08 01:31:11.000','{\"accounts_info\":null,\"acquirer_reconciliation\":[],\"additional_info\":{\"bank_info\":{\"is_same_bank_account_owner\":false},\"ip_address\":\"45.165.210.233\",\"items\":[{\"quantity\":\"1\",\"title\":\"Pedido #cmk4rtf07000112p381m1rc78\",\"unit_price\":\"1\"}],\"payer\":{\"first_name\":\"Usuário Teste\"},\"tracking_id\":\"platform:v1-blacklabel,so:ALL,type:N/A,security:none\"},\"authorization_code\":null,\"binary_mode\":false,\"brand_id\":null,\"build_version\":\"3.137.0-rc-1\",\"call_for_authorize_id\":null,\"callback_url\":null,\"captured\":true,\"card\":{},\"charges_details\":[{\"accounts\":{\"from\":\"collector\",\"to\":\"mp\"},\"amounts\":{\"original\":0.01,\"refunded\":0},\"client_id\":0,\"date_created\":\"2026-01-07T21:30:55.000-04:00\",\"external_charge_id\":\"01KEDKMT9JDYESFSBRPZHHTT56\",\"id\":\"140459341745-001\",\"last_updated\":\"2026-01-07T21:30:55.000-04:00\",\"metadata\":{\"reason\":\"\",\"source\":\"proc-svc-charges\",\"source_detail\":\"processing_fee_charge\"},\"name\":\"mercadopago_fee\",\"refund_charges\":[],\"reserve_id\":null,\"type\":\"fee\",\"update_charges\":[]}],\"charges_execution_info\":{\"internal_execution\":{\"date\":\"2026-01-07T21:30:55.188-04:00\",\"execution_id\":\"01KEDKMT8VGC5VSVDD964HC1NX\"}},\"collector_id\":397450798,\"corporation_id\":null,\"counter_currency\":null,\"coupon_amount\":0,\"currency_id\":\"BRL\",\"date_approved\":\"2026-01-07T21:31:11.000-04:00\",\"date_created\":\"2026-01-07T21:30:55.000-04:00\",\"date_last_updated\":\"2026-01-07T21:31:15.000-04:00\",\"date_of_expiration\":\"2026-01-08T21:30:54.000-04:00\",\"deduction_schema\":null,\"description\":\"Pedido #cmk4rtf07000112p381m1rc78\",\"differential_pricing_id\":null,\"external_reference\":\"cmk4rtf07000112p381m1rc78\",\"fee_details\":[{\"amount\":0.01,\"fee_payer\":\"collector\",\"type\":\"mercadopago_fee\"}],\"financing_group\":null,\"id\":140459341745,\"installments\":1,\"integrator_id\":null,\"issuer_id\":\"12501\",\"live_mode\":true,\"marketplace_owner\":null,\"merchant_account_id\":null,\"merchant_number\":null,\"metadata\":{\"reference_id\":\"cmk4rtf07000112p381m1rc78\",\"type\":\"ORDER\",\"user_id\":\"cmk4d6tj400019o4rfewbqa0v\"},\"money_release_date\":\"2026-01-07T21:31:11.000-04:00\",\"money_release_schema\":null,\"money_release_status\":\"released\",\"notification_url\":\"https://stevens-indicator-obviously-carpet.trycloudflare.com/api/payment/webhook\",\"operation_type\":\"regular_payment\",\"order\":{\"id\":\"37110552418\",\"type\":\"mercadopago\"},\"payer\":{\"email\":\"XXXXXXXXXXX\",\"entity_type\":null,\"first_name\":null,\"id\":\"3731153\",\"identification\":{\"number\":\"99999999999\",\"type\":\"CPF\"},\"last_name\":null,\"operator_id\":null,\"phone\":{\"number\":null,\"extension\":null,\"area_code\":null},\"type\":null},\"payment_method\":{\"id\":\"pix\",\"issuer_id\":\"12501\",\"type\":\"bank_transfer\"},\"payment_method_id\":\"pix\",\"payment_type_id\":\"bank_transfer\",\"platform_id\":null,\"point_of_interaction\":{\"application_data\":{\"name\":\"checkout-off\",\"operating_system\":null,\"version\":\"v2\"},\"business_info\":{\"branch\":\"Merchant Services\",\"sub_unit\":\"checkout_pro\",\"unit\":\"online_payments\"},\"location\":{\"source\":\"Payer\",\"state_id\":\"BR-MA\"},\"sub_type\":\"INTER_PSP\",\"transaction_data\":{\"bank_info\":{\"collector\":{\"account_alias\":null,\"account_holder_name\":\"Misael Feitoza Ribeiro\",\"account_id\":22816438763,\"long_name\":\"MERCADO PAGO INSTITUIÇÃO DE PAGAMENTO LTDA.\",\"transfer_account_id\":null},\"is_same_bank_account_owner\":false,\"origin_bank_id\":null,\"origin_wallet_id\":null,\"payer\":{\"account_id\":318672190,\"branch\":\"1\",\"external_account_id\":null,\"id\":null,\"identification\":{},\"long_name\":\"NU PAGAMENTOS S.A. - INSTITUIÇÃO DE PAGAMENTO\"}},\"bank_transfer_id\":121135722995,\"e2e_id\":null,\"financial_institution\":1,\"infringement_notification\":{\"status\":null,\"type\":null},\"is_end_consumer\":null,\"merchant_category_code\":null,\"qr_code\":\"00020126580014br.gov.bcb.pix01360c61a7c9-59e8-46b9-becb-65dfca9295a352040000530398654041.005802BR5923MYDENGENHARIADESOFTWARE6006So Lus62250521mpqrinter1404593417456304BCD7\",\"qr_code_base64\":\"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\",\"ticket_url\":\"https://www.mercadopago.com.br/payments/140459341745/ticket?caller_id=3731153&hash=fadfa9e8-f58d-416a-914d-9bb80645e7b1\",\"transaction_id\":\"PIXE18236120202601080131s04e3971089\"},\"type\":\"CHECKOUT\"},\"pos_id\":null,\"processing_mode\":\"aggregator\",\"refunds\":[],\"release_info\":null,\"shipping_amount\":0,\"sponsor_id\":null,\"statement_descriptor\":null,\"status\":\"approved\",\"status_detail\":\"accredited\",\"store_id\":null,\"tags\":null,\"taxes_amount\":0,\"transaction_amount\":1,\"transaction_amount_refunded\":0,\"transaction_details\":{\"acquirer_reference\":null,\"bank_transfer_id\":121135722995,\"external_resource_url\":null,\"financial_institution\":\"1\",\"installment_amount\":0,\"net_received_amount\":0.99,\"overpaid_amount\":0,\"payable_deferral_period\":null,\"payment_method_reference_id\":null,\"total_paid_amount\":1,\"transaction_id\":\"PIXE18236120202601080131s04e3971089\"},\"shipping_cost\":0}','140459341745','refunded','pix'),('cmk4yx0lu0003oeqg93yesg52','cmk4d6tj400019o4rfewbqa0v','DELIVERED',1.1,NULL,'RUA DO RETIRO, SN, COND GRAN VILAGY ELDORADO BL 04 APT 102, CEP 65067-380, SAO LUIS, Maranhão - 65066320',NULL,NULL,NULL,NULL,NULL,0,NULL,'2026-01-08 04:49:28.914','2026-01-08 05:08:07.169','user@example.com','MARIA SOUSA DIAS DA SILVA','98988489512','60521521335',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'140471419361','APPROVED','pix');
/*!40000 ALTER TABLE `order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderitem`
--

DROP TABLE IF EXISTS `orderitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `orderitem` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` double NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `commissionAmount` double DEFAULT NULL,
  `commissionRate` double DEFAULT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sellerRevenue` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orderitem_orderId_idx` (`orderId`),
  KEY `orderitem_productId_idx` (`productId`),
  CONSTRAINT `orderitem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orderitem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderitem`
--

LOCK TABLES `orderitem` WRITE;
/*!40000 ALTER TABLE `orderitem` DISABLE KEYS */;
INSERT INTO `orderitem` VALUES ('cmk4mxbra0009g8ih4id3akq4','cmk4mxbra0007g8ihs3903kvg','cmk4mvwf50005g8ihez4xtmfx',1,690,'2026-01-07 23:13:47.974',110.4,16,'cmk4hal6j0009cxgjq662ziwc',200.41),('cmk4og0l3000eg8ih38kd8ail','cmk4og0l1000cg8ihry3f6k4k','cmk4d6tkv000i9o4rd9ut0oym',1,599.99,'2026-01-07 23:56:19.572',0,0,NULL,599.99),('cmk4rtf07000312p35ieb5ugt','cmk4rtf07000112p381m1rc78','cmk4d6tla000o9o4rcu8h5147',1,1,'2026-01-08 01:30:43.637',0,0,NULL,1),('cmk4yx0lu0005oeqgi56571hd','cmk4yx0lu0003oeqg93yesg52','cmk4yvfvy0001oeqg1esc6cwo',1,1.1,'2026-01-08 04:49:28.914',0.11,10,'cmk4hal6j0009cxgjq662ziwc',0.2100000000000001);
/*!40000 ALTER TABLE `orderitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_gateway`
--

DROP TABLE IF EXISTS `payment_gateway`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payment_gateway` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 0,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config`)),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_gateway_gateway_key` (`gateway`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_gateway`
--

LOCK TABLES `payment_gateway` WRITE;
/*!40000 ALTER TABLE `payment_gateway` DISABLE KEYS */;
INSERT INTO `payment_gateway` VALUES ('cmk4no3zq000ag8ihhqux3hpc','MERCADOPAGO',1,'{\"publicKey\":\"APP_USR-d01f2f34-366f-4517-91d3-f6146b2daa7c\",\"accessToken\":\"APP_USR-2410332213519167-082513-b5faaca7ca40b3271df581d44fa3db94-397450798\",\"webhookUrl\":null,\"environment\":\"production\"}','2026-01-07 23:34:37.622','2026-01-08 00:29:52.124');
/*!40000 ALTER TABLE `payment_gateway` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan`
--

DROP TABLE IF EXISTS `plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `plan` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` double NOT NULL,
  `billingCycle` enum('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxProducts` int(11) DEFAULT NULL,
  `maxOrders` int(11) DEFAULT NULL,
  `maxRevenue` double DEFAULT NULL,
  `hasMarketplaceIntegration` tinyint(1) NOT NULL DEFAULT 0,
  `hasDropshipping` tinyint(1) NOT NULL DEFAULT 0,
  `hasAdvancedAnalytics` tinyint(1) NOT NULL DEFAULT 0,
  `hasCustomBranding` tinyint(1) NOT NULL DEFAULT 0,
  `hasPrioritySupport` tinyint(1) NOT NULL DEFAULT 0,
  `platformCommission` double NOT NULL DEFAULT 10,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `isPopular` tinyint(1) NOT NULL DEFAULT 0,
  `hasFreeTrial` tinyint(1) NOT NULL DEFAULT 0,
  `trialDays` int(11) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan`
--

LOCK TABLES `plan` WRITE;
/*!40000 ALTER TABLE `plan` DISABLE KEYS */;
INSERT INTO `plan` VALUES ('cmk4f58gu00056utacdoz7mjf','Plano Básico','Plano para Iniciantes',59.9,'MONTHLY',250,1000,250000,0,1,1,1,1,12,1,0,0,NULL,'2026-01-07 19:36:00.029','2026-01-07 21:58:26.139');
/*!40000 ALTER TABLE `plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` double NOT NULL,
  `comparePrice` double DEFAULT NULL,
  `costPrice` double DEFAULT NULL,
  `shippingCost` double DEFAULT NULL,
  `taxCost` double DEFAULT NULL,
  `totalCost` double DEFAULT NULL,
  `margin` double DEFAULT NULL,
  `isDropshipping` tinyint(1) NOT NULL DEFAULT 0,
  `dropshippingCommission` double DEFAULT NULL,
  `images` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `categoryId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierSku` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierUrl` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specifications` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `variants` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attributes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gtin` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mpn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technicalSpecs` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `availableForDropship` tinyint(1) NOT NULL DEFAULT 1,
  `isChoiceProduct` tinyint(1) NOT NULL DEFAULT 0,
  `lastSyncAt` datetime(3) DEFAULT NULL,
  `supplierRating` double DEFAULT NULL,
  `supplierShippingSpeed` double DEFAULT NULL,
  `supplierStock` int(11) DEFAULT NULL,
  `supplierStoreId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplierStoreName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `bookAuthor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bookGenre` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bookIsbn` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bookPublisher` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bookTitle` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_slug_key` (`slug`),
  KEY `product_categoryId_idx` (`categoryId`),
  KEY `product_sellerId_idx` (`sellerId`),
  KEY `product_supplierId_idx` (`supplierId`),
  CONSTRAINT `product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `category` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `product_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `seller` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `product_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `supplier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES ('cmk4d6tk8000a9o4rumjyqhm5','Smartphone Galaxy S23','smartphone-galaxy-s23','Smartphone de última geração com câmera de alta resolução e processador potente',2999.99,3499.99,NULL,NULL,NULL,NULL,NULL,1,18,'[\"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400\"]',50,1,'cmk4d6tjk00049o4r607nfnwa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 18:41:14.791','2026-01-07 18:43:33.294',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tkg000c9o4rv4ut4l75','Notebook Dell Inspiron 15','notebook-dell-inspiron-15','Notebook potente para trabalho e estudos, com Intel Core i7 e 16GB RAM',4299.99,4999.99,NULL,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400\"]',30,1,'cmk4d6tjk00049o4r607nfnwa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 18:41:14.800','2026-01-07 18:41:14.800',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tkk000e9o4rpfa5eux2','Fone Bluetooth JBL','fone-bluetooth-jbl','Fone de ouvido bluetooth com cancelamento de ruído',399.99,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400\"]',100,0,'cmk4d6tjk00049o4r607nfnwa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 18:41:14.804','2026-01-07 18:41:14.804',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tko000g9o4rs0x2t1qz','Camiseta Básica Premium','camiseta-basica-premium','Camiseta de algodão 100% premium, confortável e durável',79.99,129.99,NULL,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400\"]',200,0,'cmk4d6tjo00059o4r4itychtl',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 18:41:14.809','2026-01-07 18:41:14.809',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tkv000i9o4rd9ut0oym','Tênis Nike Air Max','tenis-nike-air-max','Tênis esportivo com tecnologia Air Max para máximo conforto',599.99,799.99,NULL,NULL,NULL,NULL,NULL,1,16,'[\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400\"]',80,1,'cmk4d6tk100089o4rslhi3dyl',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 18:41:14.816','2026-01-07 18:43:24.658',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tl0000k9o4r0hctsqlb','Livro: Clean Code','livro-clean-code','Guia completo sobre código limpo e boas práticas de programação',89.99,25,14.2,NULL,NULL,NULL,84.22046894099344,0,NULL,'[\"https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400\"]',50,1,'cmk4d6tjr00069o4rp539eypv',NULL,NULL,'1421221142114112211',NULL,NULL,NULL,NULL,'9788535902773','Livro','Livro','Não se Aplica',NULL,'{\"product_type\":\"livro\",\"dual_sim\":\"Não\",\"operadora\":\"Desbloqueado\"}','2026-01-07 18:41:14.821','2026-01-07 20:01:58.435',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,'Machado de Assis','Biografia',NULL,'Editora Abril','Clear - Cone'),('cmk4d6tl4000m9o4rsb7f46ia','Luminária LED Moderna','luminaria-led-moderna','Luminária de mesa com LED ajustável, perfeita para leitura',149.99,NULL,NULL,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400\"]',60,0,'cmk4d6tjx00079o4r3qjoobzk',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Luminaria','Luz','Preto',NULL,'{\"product_type\":\"luminarias\",\"dual_sim\":\"Não\",\"operadora\":\"Desbloqueado\"}','2026-01-07 18:41:14.824','2026-01-07 20:14:32.314',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4d6tla000o9o4rcu8h5147','Smart Watch Series 7','smart-watch-series-7','Relógio inteligente com monitoramento de saúde e fitness',1,0.3,0.5,NULL,NULL,NULL,50,1,10,'[\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400\"]',158,1,'cmk4d6tjk00049o4r607nfnwa',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Relogio','Smartwat','Preto',NULL,'{\"dual_sim\":\"Não\",\"operadora\":\"Desbloqueado\"}','2026-01-07 18:41:14.830','2026-01-08 01:29:17.961',1,0,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL),('cmk4mvwf50005g8ihez4xtmfx','Tênis Nike Air Max','tenis-nike-air-max-cmk4ha-yth99q','Tênis esportivo com tecnologia Air Max para máximo conforto',690,897,599.99,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400\"]',80,0,'cmk4d6tk100089o4rslhi3dyl','cmk4hal6j0009cxgjq662ziwc',NULL,'cmk4d6tkv000i9o4rd9ut0oym','/produtos/tenis-nike-air-max',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-07 23:12:41.441','2026-01-07 23:12:41.441',0,0,'2026-01-07 23:12:41.439',NULL,NULL,80,NULL,'Marketplace',1,NULL,NULL,NULL,NULL,NULL),('cmk4yvfvy0001oeqg1esc6cwo','Smart Watch Series 7','smart-watch-series-7-cmk4ha-nup1ss','Relógio inteligente com monitoramento de saúde e fitness',1.1,1.43,1,NULL,NULL,NULL,NULL,0,NULL,'[\"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400\"]',158,0,'cmk4d6tjk00049o4r607nfnwa','cmk4hal6j0009cxgjq662ziwc',NULL,'cmk4d6tla000o9o4rcu8h5147','/produtos/smart-watch-series-7',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-08 04:48:15.405','2026-01-08 04:48:15.405',0,0,'2026-01-08 04:48:15.402',NULL,NULL,158,NULL,'Marketplace',1,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_type`
--

DROP TABLE IF EXISTS `product_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `product_type` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_type_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_type`
--

LOCK TABLES `product_type` WRITE;
/*!40000 ALTER TABLE `product_type` DISABLE KEYS */;
INSERT INTO `product_type` VALUES ('cmk4gi1es0002cxgjx5vp14us','Luminarias','luminarias','','',1,'2026-01-07 20:13:57.028','2026-01-07 20:13:57.028'),('pt1','Livro','livro',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000'),('pt2','Celular','celular',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000'),('pt3','NookBooks','nookbooks','','',1,'2026-01-07 16:40:02.000','2026-01-07 19:41:44.555'),('pt4','Vestußrio','vestuario',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000');
/*!40000 ALTER TABLE `product_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seller`
--

DROP TABLE IF EXISTS `seller`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seller` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storeName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storeSlug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storeDescription` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storeLogo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `storeBanner` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sellerType` enum('PF','PJ') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rg` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dataNascimento` datetime(3) DEFAULT NULL,
  `cnpj` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razaoSocial` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nomeFantasia` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `inscricaoEstadual` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cep` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `complemento` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bairro` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `banco` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agencia` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conta` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipoConta` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `chavePix` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commission` double NOT NULL DEFAULT 10,
  `status` enum('PENDING','ACTIVE','SUSPENDED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seller_userId_key` (`userId`),
  UNIQUE KEY `seller_storeSlug_key` (`storeSlug`),
  CONSTRAINT `seller_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seller`
--

LOCK TABLES `seller` WRITE;
/*!40000 ALTER TABLE `seller` DISABLE KEYS */;
INSERT INTO `seller` VALUES ('cmk4hal6j0009cxgjq662ziwc','cmk4h7o8l0007cxgj8guv496w','MARCIOSTORE','marciostore','LOJA DE VENDA DE PRODUTOS IMPORTADOS',NULL,NULL,'PF','01940069300','140814520008','1985-11-13 00:00:00.000',NULL,NULL,NULL,NULL,'65067380','Rua do Retiro','Rua do retiro natal','casa','Turu','São Luís','MA','Banco do Brasil','2743','9772-1','corrente','01940069300',10,'ACTIVE','2026-01-07 20:36:09.019','2026-01-07 21:55:50.408');
/*!40000 ALTER TABLE `seller` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sellermarketplacecredential`
--

DROP TABLE IF EXISTS `sellermarketplacecredential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sellermarketplacecredential` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marketplace` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mlClientId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mlClientSecret` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mlAccessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mlRefreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mlUserId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mlExpiresAt` datetime(3) DEFAULT NULL,
  `aliAppKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aliAppSecret` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aliTrackingId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aliAccessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeePartnerId` int(11) DEFAULT NULL,
  `shopeePartnerKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeeAccessToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeeRefreshToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeeShopId` int(11) DEFAULT NULL,
  `shopeeMerchantName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeeRegion` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shopeeExpiresAt` datetime(3) DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sellermarketplacecredential_sellerId_marketplace_key` (`sellerId`,`marketplace`),
  KEY `sellermarketplacecredential_sellerId_idx` (`sellerId`),
  CONSTRAINT `sellermarketplacecredential_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `seller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sellermarketplacecredential`
--

LOCK TABLES `sellermarketplacecredential` WRITE;
/*!40000 ALTER TABLE `sellermarketplacecredential` DISABLE KEYS */;
/*!40000 ALTER TABLE `sellermarketplacecredential` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shopeeauth`
--

DROP TABLE IF EXISTS `shopeeauth`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shopeeauth` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `partnerId` int(11) NOT NULL,
  `partnerKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accessToken` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `refreshToken` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `shopId` int(11) NOT NULL,
  `merchantName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expiresAt` datetime(3) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shopeeauth_userId_key` (`userId`),
  CONSTRAINT `shopeeauth_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shopeeauth`
--

LOCK TABLES `shopeeauth` WRITE;
/*!40000 ALTER TABLE `shopeeauth` DISABLE KEYS */;
/*!40000 ALTER TABLE `shopeeauth` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription`
--

DROP TABLE IF EXISTS `subscription`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sellerId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `planId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING_PAYMENT','TRIAL','ACTIVE','EXPIRED','CANCELLED','SUSPENDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRIAL',
  `startDate` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `endDate` datetime(3) NOT NULL,
  `trialEndDate` datetime(3) DEFAULT NULL,
  `cancelledAt` datetime(3) DEFAULT NULL,
  `price` double NOT NULL,
  `billingCycle` enum('MONTHLY','QUARTERLY','SEMIANNUAL','ANNUAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nextBillingDate` datetime(3) DEFAULT NULL,
  `autoRenew` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscription_sellerId_key` (`sellerId`),
  KEY `subscription_planId_fkey` (`planId`),
  CONSTRAINT `subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `subscription_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `seller` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription`
--

LOCK TABLES `subscription` WRITE;
/*!40000 ALTER TABLE `subscription` DISABLE KEYS */;
INSERT INTO `subscription` VALUES ('cmk4mty8w0001g8ihapjbb4fe','cmk4hal6j0009cxgjq662ziwc','cmk4f58gu00056utacdoz7mjf','ACTIVE','2026-01-07 23:11:10.471','2026-02-07 23:11:10.471',NULL,NULL,59.9,'MONTHLY','2026-02-07 23:11:10.471',1,'2026-01-07 23:11:10.492','2026-01-07 23:11:10.492');
/*!40000 ALTER TABLE `subscription` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'aliexpress',
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `commission` double NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplier_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
INSERT INTO `supplier` VALUES ('cmk4d6tj800029o4rurl9tx8y','Fornecedor Global','contato@fornecedor1.com','(11) 98765-4321','https://fornecedorglobal.com',NULL,NULL,'aliexpress',1,15,1,'2026-01-07 18:41:14.756','2026-01-07 18:41:14.756'),('cmk4d6tjf00039o4rg23bhvk1','Dropship Premium','vendas@dropship.com','(21) 99876-5432','https://dropshippremium.com','https://api.dropshippremium.com/v1','demo-api-key-12345','aliexpress',1,20,1,'2026-01-07 18:41:14.764','2026-01-07 18:41:14.764');
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

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
  CONSTRAINT `user_workForSellerId_fkey` FOREIGN KEY (`workForSellerId`) REFERENCES `seller` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('cmk4d6tg000009o4r1appyn9j','Misael Feitoza Ribeiro','misael_ribeiro@hotmail.com',NULL,NULL,'$2a$10$v.pWTXPmc8J.ot7E0CFCOek4J82LjwCs91ZPZ01CFzEcI4dsg/FVi',NULL,'01940069300','ADMIN',NULL,NULL,'2026-01-07 18:41:14.639','2026-01-07 18:41:14.639'),('cmk4d6tj400019o4rfewbqa0v','MARIA SOUSA DIAS DA SILVA','user@example.com',NULL,NULL,'$2a$10$2Sfxobi2ZT/5JfulWdLJN.VunhQcSvrfFgZcTKETVXSGvT/dcEgaW',NULL,NULL,'USER',NULL,NULL,'2026-01-07 18:41:14.752','2026-01-08 01:36:26.705'),('cmk4h7o8l0007cxgj8guv496w','MARCIO GOMES DA COSTA','marcio@gmail.com',NULL,NULL,'$2a$10$IBgvOWoqhdYRn527desZQOARe2Yq.UCZlfDJdV2s/OvPxZt51mixO',NULL,NULL,'SELLER',NULL,NULL,'2026-01-07 20:33:53.013','2026-01-07 20:36:09.027');
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

-- Dump completed on 2026-01-08  2:21:53
