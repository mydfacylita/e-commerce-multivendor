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
  `parentId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_slug_key` (`slug`),
  KEY `category_parentId_idx` (`parentId`),
  CONSTRAINT `category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `category` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES ('cat_roupas_femininas','Roupas Femininas','roupas-femininas','Moda feminina',NULL,'cat_vestuario','2026-01-09 14:55:59.000','2026-01-09 14:55:59.000'),('cat_roupas_infantis','Roupas Infantis','roupas-infantis','Moda infantil',NULL,'cat_vestuario','2026-01-09 14:55:59.000','2026-01-09 14:55:59.000'),('cat_roupas_masculinas','Roupas Masculinas','roupas-masculinas','Moda masculina',NULL,'cat_vestuario','2026-01-09 14:55:59.000','2026-01-09 14:55:59.000'),('cat_vestuario','Vestuário','vestuario','Roupas e Acessórios ','https://radionacional-v3.s3.amazonaws.com/s3fs-public/styles/portadas_relaciona_4_3/public/node/article/field_image/hangers-ga67cff71c_1280.jpg?h=1c9b88c9&itok=f8JZUxpO',NULL,'2026-01-09 14:55:59.000','2026-01-09 18:21:29.605'),('cmk4d6tjk00049o4r607nfnwa','Eletrônicos','eletronicos','Produtos eletrônicos e tecnologia de ponta','https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',NULL,'2026-01-07 18:41:14.768','2026-01-07 18:41:14.768'),('cmk4d6tjo00059o4r4itychtl','Moda','moda','Roupas e acessórios para todos os estilos','https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',NULL,'2026-01-07 18:41:14.772','2026-01-07 18:41:14.772'),('cmk4d6tjr00069o4rp539eypv','Livros','livros','Livros de diversos gêneros e autores','https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',NULL,'2026-01-07 18:41:14.775','2026-01-07 18:41:14.775'),('cmk4d6tjx00079o4r3qjoobzk','Casa e Decoração','casa-decoracao','Itens para deixar sua casa ainda mais bonita','https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=400',NULL,'2026-01-07 18:41:14.781','2026-01-07 18:41:14.781'),('cmk4d6tk100089o4rslhi3dyl','Esportes','esportes','Equipamentos e roupas para prática esportiva','https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',NULL,'2026-01-07 18:41:14.786','2026-01-07 18:41:14.786'),('cmk4ei4sw00046utajyfb4j4b','Saúde','saude','Produtos de Saúde','https://wordpress-cms-revista-prod-assets.quero.space/legacy_posts/post_images/32018/7b3c5bb401da576bd640addf39e16073920e351e.jpg?1603218870',NULL,'2026-01-07 19:18:02.191','2026-01-07 19:18:02.191'),('cmk5lk02x000089q92ttfysrx','Calçados','calcados','Item para calçar bem','https://images.tcdn.com.br/img/img_prod/1166467/tenis_one_flip_branco_preto_555_1_e2cca1b1ea5140cdc700067710b6e631.jpeg',NULL,'2026-01-08 15:23:12.872','2026-01-08 15:23:12.872'),('cmk7ufukk001f27y53y9oz15c','Importados','importados','Produtos importados do AliExpress',NULL,NULL,'2026-01-10 05:07:28.004','2026-01-10 05:07:28.004');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
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
-- Table structure for table `systemconfig`
--

DROP TABLE IF EXISTS `systemconfig`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `systemconfig` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `systemconfig_key_key` (`key`),
  KEY `systemconfig_category_idx` (`category`),
  KEY `systemconfig_key_idx` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `systemconfig`
--

LOCK TABLES `systemconfig` WRITE;
/*!40000 ALTER TABLE `systemconfig` DISABLE KEYS */;
INSERT INTO `systemconfig` VALUES ('cmk8o7or0000276h77miob9hv','maintenance.enabled','false','manutencao','Modo Manutenção Ativo',NULL,'boolean','2026-01-10 19:00:55.692','2026-01-14 16:53:14.769'),('cmk8o7orc000376h7oy5yuw6z','maintenance.message','Estamos em manutenção. Voltamos em breve!','manutencao','Mensagem de Manutenção',NULL,'textarea','2026-01-10 19:00:55.704','2026-01-14 16:53:14.800'),('cmk8o7orh000476h7loe06a61','maintenance.estimatedTime','14/01/2026 às 18:30','manutencao','Previsão de Retorno',NULL,'text','2026-01-10 19:00:55.710','2026-01-14 16:53:14.808'),('cmk8oanfh000a76h7odggbzo1','ecommerce.freeShippingMin','99.99','ecommerce','Frete Grátis Acima de (R$)',NULL,'number','2026-01-10 19:03:13.949','2026-01-14 14:31:34.486'),('cmk8oanfs000b76h713g0a8iy','ecommerce.defaultCommission','10','ecommerce','Comissão Padrão (%)',NULL,'number','2026-01-10 19:03:13.960','2026-01-14 14:31:34.493'),('cmk8oanfw000c76h7rwg70lij','ecommerce.minOrderValue','49.99','ecommerce','Pedido Mínimo (R$)',NULL,'number','2026-01-10 19:03:13.964','2026-01-14 14:31:34.497'),('cmk8oang0000d76h7fagz0tth','ecommerce.maxInstallments','8','ecommerce','Máximo de Parcelas',NULL,'number','2026-01-10 19:03:13.968','2026-01-10 23:36:13.396'),('cmk8oang6000e76h70shookgd','ecommerce.minInstallmentValue','10','ecommerce','Valor Mínimo da Parcela (R$)',NULL,'number','2026-01-10 19:03:13.974','2026-01-10 23:36:13.400'),('cmk8oangb000f76h70ykzwkiv','ecommerce.showStock','false','ecommerce','Mostrar Estoque',NULL,'boolean','2026-01-10 19:03:13.979','2026-01-14 14:31:34.501'),('cmk8obs0z000s76h7d0b00em9','appearance.primaryColor','#3B82F6','aparencia','Cor Primária',NULL,'color','2026-01-10 19:04:06.563','2026-01-14 14:31:34.365'),('cmk8obs1d000t76h744084znb','appearance.secondaryColor','#F97316','aparencia','Cor Secundária',NULL,'color','2026-01-10 19:04:06.578','2026-01-14 14:31:34.369'),('cmk8obs1k000u76h7la3c1vd0','appearance.zoom','80','aparencia','Zoom do Site (%)','Escala visual do site (80-120). Ex: 80 = site menor, 100 = normal, 120 = site maior','number','2026-01-10 19:04:06.585','2026-01-14 14:31:34.386'),('cmk8obs1r000v76h7qitiojf6','appearance.logo','/logo-animated.svg','aparencia','Logo',NULL,'image','2026-01-10 19:04:06.592','2026-01-14 14:31:34.394'),('cmk8obs1x000w76h7kx14d2mu','appearance.favicon','/favicon.svg','aparencia','Favicon',NULL,'image','2026-01-10 19:04:06.598','2026-01-14 14:31:34.398'),('cmk8obs23000x76h74u0hilzb','appearance.heroBanner','','aparencia','Banner Principal (Hero)','Imagem de fundo do banner principal','image','2026-01-10 19:04:06.603','2026-01-14 14:31:34.402'),('cmk8obs2b000y76h78pmwomv4','appearance.heroTitle','MYDSHOP','aparencia','Título do Banner',NULL,'text','2026-01-10 19:04:06.612','2026-01-14 14:31:34.407'),('cmk8obs2f000z76h7zgx6fqy9','appearance.heroSubtitle','Aqui tem preço de verdade','aparencia','Subtítulo do Banner',NULL,'text','2026-01-10 19:04:06.616','2026-01-14 14:31:34.413'),('cmk8obs2m001076h77yzfhwge','appearance.banners','[]','aparencia','Banners Rotativos','Lista de banners para o carrossel','json','2026-01-10 19:04:06.622','2026-01-10 19:14:52.119'),('cmk8od9kr001176h7w8dl7znr','site.name','MYDSHOP','geral','Nome do Site',NULL,'text','2026-01-10 19:05:15.963','2026-01-14 14:31:34.276'),('cmk8od9kx001276h7qmtxffk3','site.description','Seu marketplace online, compre com descontos imperdíveis em toda a loja','geral','Descrição',NULL,'textarea','2026-01-10 19:05:15.969','2026-01-14 14:31:34.331'),('cmk8od9l1001376h7q8oqzuum','site.email','contato@mydshop.com.br','geral','E-mail de Contato',NULL,'text','2026-01-10 19:05:15.974','2026-01-14 14:31:34.337'),('cmk8od9l7001476h7v4z5sco9','site.phone','(098)9912-69315','geral','Telefone',NULL,'text','2026-01-10 19:05:15.979','2026-01-14 14:31:34.345'),('cmk8od9lf001576h7c2dcmv0w','site.whatsapp','(098)99126-9315','geral','WhatsApp',NULL,'text','2026-01-10 19:05:15.987','2026-01-14 14:31:34.350'),('cmk8odo5t001676h700z4n06w','email.smtpHost','mail.mydsistemas.com.br','email','SMTP Host',NULL,'text','2026-01-10 19:05:34.865','2026-01-14 14:31:34.576'),('cmk8odo5x001776h7c8elcd34','email.smtpPort','587','email','SMTP Port',NULL,'number','2026-01-10 19:05:34.869','2026-01-14 14:31:34.581'),('cmk8odo61001876h7hoy5d1s0','email.smtpUser','contato@mydsistemas.com.br','email','SMTP Usuário',NULL,'text','2026-01-10 19:05:34.873','2026-01-14 14:31:34.585'),('cmk8odo6u001976h7vbzl3j20','email.smtpPassword','MydEmail2026!','email','SMTP Senha',NULL,'password','2026-01-10 19:05:34.903','2026-01-14 14:31:34.590'),('cmk8odo6z001a76h7tq6p7lu0','email.fromName','MYDSHOP','email','Nome do Remetente',NULL,'text','2026-01-10 19:05:34.907','2026-01-14 14:31:34.603'),('cmk8odo73001b76h7wone1sej','email.fromEmail','noreply@mydshop.com.br','email','E-mail do Remetente',NULL,'text','2026-01-10 19:05:34.911','2026-01-14 14:31:34.608'),('cmk8oe34i001z76h7yjrsa2kf','seo.title','MYDSHOP - Seu Marketplace Online','seo','Título da Página',NULL,'text','2026-01-10 19:05:54.259','2026-01-14 14:31:34.548'),('cmk8oe34r002076h7fxzg4mxg','seo.description','Encontre os melhores produtos com os melhores preços na MYDSHOP','seo','Meta Description',NULL,'textarea','2026-01-10 19:05:54.268','2026-01-14 14:31:34.552'),('cmk8oe34w002176h7nebtb2qu','seo.keywords','marketplace, loja online, compras, produtos','seo','Keywords',NULL,'text','2026-01-10 19:05:54.272','2026-01-14 14:31:34.557'),('cmk8oe351002276h7il5r17yx','seo.ogImage','','seo','Imagem para Redes Sociais',NULL,'image','2026-01-10 19:05:54.277','2026-01-14 14:31:34.561'),('cmk8oe357002376h7lf976y8x','seo.googleAnalytics','','seo','Google Analytics ID',NULL,'text','2026-01-10 19:05:54.283','2026-01-14 14:31:34.565'),('cmk8oe35c002476h761tgnmmk','seo.facebookPixel','','seo','Facebook Pixel ID',NULL,'text','2026-01-10 19:05:54.288','2026-01-14 14:31:34.569'),('cmk8s7wfc0034pn6q31e77p8a','ecommerce.pixDiscount','5','ecommerce','Desconto PIX (%)','Desconto para pagamentos via PIX','number','2026-01-10 20:53:04.104','2026-01-14 14:31:34.507'),('cmk8s9mig003dpn6qmqpx8ugd','appearance.heroDiscount','10%','aparencia','Desconto no Banner','Ex: 10%, 25%, FREE','text','2026-01-10 20:54:24.568','2026-01-14 14:31:34.417'),('cmk8s9mip003epn6q4cqfthws','appearance.heroBadge','descontão de até','aparencia','Badge do Banner',NULL,'text','2026-01-10 20:54:24.577','2026-01-14 14:31:34.422'),('cmk8s9mit003fpn6qgkcw81cs','appearance.heroButtonText','Vamos COMPRAR AGORA','aparencia','Texto do Botão',NULL,'text','2026-01-10 20:54:24.581','2026-01-14 14:31:34.428'),('cmk8s9mix003gpn6qyvyxtyaq','appearance.heroButtonLink','/carrinho','aparencia','Link do Botão',NULL,'text','2026-01-10 20:54:24.586','2026-01-14 14:31:34.432'),('cmk8uhoq00047pn6qzznqho6b','loading.mascotTheme','carnaval','loading','Tema do Mascote','Escolha o tema festivo para o mascote de carregamento','select','2026-01-10 21:56:39.912','2026-01-14 14:31:34.462'),('cmk8uhos80048pn6q3xq5vgc9','loading.message1','Carregando...','loading','Mensagem 1','Primeira mensagem de carregamento','text','2026-01-10 21:56:39.993','2026-01-14 14:31:34.465'),('cmk8uhotc0049pn6qst53oneg','loading.message2','Quase lá...','loading','Mensagem 2','Segunda mensagem de carregamento','text','2026-01-10 21:56:40.032','2026-01-14 14:31:34.470'),('cmk8uhoum004apn6qvoe7bc40','loading.message3','Preparando...','loading','Mensagem 3','Terceira mensagem de carregamento','text','2026-01-10 21:56:40.078','2026-01-14 14:31:34.478'),('cmk8uhovq004bpn6qdf1et8h6','loading.backgroundColor','carnaval','loading','Cor de Fundo','Cor de fundo da tela de loading','select','2026-01-10 21:56:40.118','2026-01-14 14:31:34.482'),('cmk8y1pta001711xbp3lwfrcv','social.facebook','','social','Facebook','URL completa do Facebook','text','2026-01-10 23:36:13.295','2026-01-14 14:31:34.435'),('cmk8y1ptl001811xbpvtbwmle','social.instagram','','social','Instagram','URL completa do Instagram','text','2026-01-10 23:36:13.305','2026-01-14 14:31:34.440'),('cmk8y1ptv001911xbc6m9miat','social.twitter','','social','Twitter/X','URL completa do Twitter','text','2026-01-10 23:36:13.315','2026-01-14 14:31:34.446'),('cmk8y1pu1001a11xbrta2zk3h','social.youtube','','social','YouTube','URL completa do canal','text','2026-01-10 23:36:13.321','2026-01-14 14:31:34.449'),('cmk8y1pu5001b11xbd8xxo19k','social.whatsapp','','social','WhatsApp Link','Número para link wa.me (Ex: 5511999999999)','text','2026-01-10 23:36:13.326','2026-01-14 14:31:34.453'),('cmk8y1pub001c11xbfi9fnuz4','social.tiktok','','social','TikTok','URL completa do TikTok','text','2026-01-10 23:36:13.332','2026-01-14 14:31:34.458'),('cmka0ynat000rz89yqvzhlqf7','site.cnpj','24.223.868/0001-19','geral','CNPJ','CNPJ da empresa','text','2026-01-11 17:45:35.093','2026-01-14 14:31:34.354'),('cmka0ynb7000sz89ynxauqu50','site.address','RUA: Av. Dos Holandeses Nº 15\nBairro: Calhau\nCEP: 65065-180\nCidade: São Luis - MA ','geral','Endereço','Endereço completo da empresa','textarea','2026-01-11 17:45:35.107','2026-01-14 14:31:34.361'),('cmka269le0026z89yk15d9wwh','site.title','MYDSHOP - Marketplace Online','geral','Título da Página','Título que aparece na aba do navegador','text','2026-01-11 18:19:30.194','2026-01-14 14:31:34.319'),('cmkabylct000zfdsxm04rt8h2','email.smtpSecure','true','email','Conexão SSL/TLS','Usar SSL (porta 465) ao invés de STARTTLS (porta 587)','boolean','2026-01-11 22:53:28.349','2026-01-14 14:31:34.598'),('cmkahynmd000iss8uo1ffs680','correios.enabled','true','correios','Correios Ativo',NULL,'text','2026-01-12 01:41:28.980','2026-01-13 15:03:55.953'),('cmkahynmw000jss8usjte8kaa','correios.usuario','misael_ribeiro@hotmail.com','correios','Usuário Correios',NULL,'text','2026-01-12 01:41:29.000','2026-01-12 01:41:29.000'),('cmkahynn0000kss8upxgq80r6','correios.senha','131189','correios','Senha Correios',NULL,'text','2026-01-12 01:41:29.004','2026-01-12 01:41:29.004'),('cmkahynnb000lss8ud1aj0m7z','correios.codigoAdministrativo','','correios','Código Administrativo',NULL,'text','2026-01-12 01:41:29.016','2026-01-12 01:41:29.016'),('cmkahynnf000mss8utoo9ktaz','correios.cartaoPostagem','','correios','Cartão Postagem',NULL,'text','2026-01-12 01:41:29.020','2026-01-12 01:41:29.020'),('cmkahynno000nss8umd5ql6yt','correios.cnpj','','correios','CNPJ',NULL,'text','2026-01-12 01:41:29.028','2026-01-12 01:41:29.028'),('cmkahynnt000oss8ulyevj3xv','correios.cepOrigem','65067380','correios','CEP Origem',NULL,'text','2026-01-12 01:41:29.034','2026-01-12 01:41:29.034'),('cmkahyno7000pss8ueylb9ppq','correios.servicoSedex','true','correios','SEDEX Ativo',NULL,'text','2026-01-12 01:41:29.047','2026-01-12 01:41:29.047'),('cmkahynoa000qss8u99nykyst','correios.servicoPac','true','correios','PAC Ativo',NULL,'text','2026-01-12 01:41:29.051','2026-01-12 01:41:29.051'),('cmkahynof000rss8utk7qu5e0','correios.servicoSedex10','false','correios','SEDEX 10 Ativo',NULL,'text','2026-01-12 01:41:29.055','2026-01-12 01:41:29.055'),('cmkahynon000sss8uawuxj3mx','correios.servicoSedex12','false','correios','SEDEX 12 Ativo',NULL,'text','2026-01-12 01:41:29.063','2026-01-12 01:41:29.063'),('cmkahynoq000tss8utgqzxypx','correios.servicoSedexHoje','false','correios','SEDEX Hoje Ativo',NULL,'text','2026-01-12 01:41:29.066','2026-01-12 01:41:29.066'),('cmkbhklbj0000k0kt51bdbwn9','app.name','MYDSHOP','app','name','Configuração do app: app.name','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.081'),('cmkbhklc50001k0kttt5gbxbt','app.slogan','Sua loja na palma da mão','app','slogan','Configuração do app: app.slogan','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.082'),('cmkbhklc50002k0ktwyhlby02','app.logo','/uploads/products/1768241909108-pp1ufcpwtyg.svg','app','logo','Configuração do app: app.logo','image','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc50003k0ktdpbqxtp3','app.logoLight','','app','logo Light','Configuração do app: app.logoLight','image','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc60004k0kt1d09wasq','app.logoDark','','app','logo Dark','Configuração do app: app.logoDark','image','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc60005k0kttu11znoj','app.icon','/uploads/products/1768241913865-bb612uprel.svg','app','icon','Configuração do app: app.icon','image','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc60006k0ktmjvniw0i','app.splashScreen','/uploads/products/1768241926798-kf5wi21p9gp.svg','app','splash Screen','Configuração do app: app.splashScreen','image','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc60007k0kts4jqz2vx','app.primaryColor','#f97316','app','primary Color','Configuração do app: app.primaryColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc70008k0ktc5kiac9s','app.secondaryColor','#2563eb','app','secondary Color','Configuração do app: app.secondaryColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc70009k0ktv6gwkrl9','app.accentColor','#8b5cf6','app','accent Color','Configuração do app: app.accentColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc7000ak0ktwwo446dl','app.backgroundColor','#ffffff','app','background Color','Configuração do app: app.backgroundColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc7000bk0kt49o1oohe','app.textColor','#1f2937','app','text Color','Configuração do app: app.textColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc7000ck0kt6n3fdy1m','app.successColor','#16a34a','app','success Color','Configuração do app: app.successColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc7000dk0kttv1mza9g','app.warningColor','#eab308','app','warning Color','Configuração do app: app.warningColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.083'),('cmkbhklc8000ek0ktzj8h4g9n','app.dangerColor','#ef4444','app','danger Color','Configuração do app: app.dangerColor','color','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc8000fk0kta50q6tk0','app.loginTitle','Bem-vindo de volta!','app','login Title','Configuração do app: app.loginTitle','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc8000gk0ktirweyc6j','app.loginSubtitle','Faça login para continuar','app','login Subtitle','Configuração do app: app.loginSubtitle','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc8000hk0kthqfxf05h','app.registerTitle','Crie sua conta','app','register Title','Configuração do app: app.registerTitle','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc8000ik0kt6i915d9a','app.registerSubtitle','É rápido e gratuito','app','register Subtitle','Configuração do app: app.registerSubtitle','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc8000jk0kte9gc0213','app.homeWelcome','Olá! O que você procura hoje?','app','home Welcome','Configuração do app: app.homeWelcome','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc9000kk0kt8vjycnka','app.enablePushNotifications','true','app','enable Push Notifications','Configuração do app: app.enablePushNotifications','boolean','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc9000lk0ktguhdvqve','app.enableBiometricLogin','true','app','enable Biometric Login','Configuração do app: app.enableBiometricLogin','boolean','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc9000mk0ktyn0ym67m','app.enableDarkMode','true','app','enable Dark Mode','Configuração do app: app.enableDarkMode','boolean','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc9000nk0kthtyalzpf','app.enableGuestCheckout','false','app','enable Guest Checkout','Configuração do app: app.enableGuestCheckout','boolean','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklc9000ok0ktvgprzbdz','app.maintenanceMode','true','app','maintenance Mode','Configuração do app: app.maintenanceMode','boolean','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklca000pk0kt13emrfgj','app.maintenanceMessage','Estamos em manutenção. Voltamos em breve!','app','maintenance Message','Configuração do app: app.maintenanceMessage','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklca000qk0ktz8abmbq5','app.termsUrl','/termos','app','terms Url','Configuração do app: app.termsUrl','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklca000rk0ktvlmgomxv','app.privacyUrl','/privacidade','app','privacy Url','Configuração do app: app.privacyUrl','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklca000sk0ktkvhugxw0','app.supportEmail','suporte@mydshop.com.br','app','support Email','Configuração do app: app.supportEmail','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklca000tk0ktsdgeb5cx','app.supportPhone','(98)99126-9315','app','support Phone','Configuração do app: app.supportPhone','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbhklcb000uk0kt1x76a0gm','app.supportWhatsapp','5598988489512','app','support Whatsapp','Configuração do app: app.supportWhatsapp','text','2026-01-12 18:18:18.991','2026-01-13 00:54:09.084'),('cmkbkobfx002uk0kthfhgplt0','payment.acceptsCreditCard','true','ecommerce','Aceita Cartão de Crédito','Habilitar pagamento com cartão','boolean','2026-01-12 19:45:11.661','2026-01-14 14:31:34.512'),('cmkbkobgi002vk0ktk3o5u9f9','payment.maxInstallments','12','ecommerce','Máximo de Parcelas','Máximo de parcelas permitidas','select','2026-01-12 19:45:11.682','2026-01-14 14:31:34.516'),('cmkbkobgq002wk0ktzz4nackh','payment.installmentsFreeInterest','1','ecommerce','Parcelas Sem Juros','Parcelas sem juros (absorvido pela loja)','select','2026-01-12 19:45:11.690','2026-01-14 14:31:34.520'),('cmkbkobgx002xk0kt5nfqahs4','payment.minInstallmentValue','10','ecommerce','Valor Mínimo da Parcela (R$)','Valor mínimo de cada parcela','number','2026-01-12 19:45:11.697','2026-01-14 14:31:34.530'),('cmkblr6qi0000wpqbkgqrxurr','app.apiKey','myd_3514320b6b4b354d13513888d1300e41647a8fccf2213f46ecce72f25d3834d6','app','API Key do App Móvel','API Key para o aplicativo móvel MYDSHOP','text','2026-01-12 20:15:25.146','2026-01-12 20:15:25.146'),('cmkbn6tes000052eme68nyy55','app.banners','[{\"id\":\"1\",\"title\":\"Super Ofertas\",\"subtitle\":\"Até 50% OFF em produtos selecionados\",\"icon\":\"🔥\",\"gradient\":\"linear-gradient(135deg, #f97316, #ea580c)\",\"buttonText\":\"Ver Ofertas\",\"buttonLink\":\"/ofertas\",\"active\":true,\"order\":1},{\"id\":\"2\",\"title\":\"Frete Grátis\",\"subtitle\":\"Em compras acima de R$ 99\",\"icon\":\"🚚\",\"gradient\":\"linear-gradient(135deg, #16a34a, #15803d)\",\"buttonText\":\"Aproveitar\",\"buttonLink\":\"/frete-gratis\",\"active\":true,\"order\":2},{\"id\":\"3\",\"title\":\"Novidades\",\"subtitle\":\"Confira os produtos recém-chegados\",\"icon\":\"✨\",\"gradient\":\"linear-gradient(135deg, #8b5cf6, #7c3aed)\",\"buttonText\":\"Explorar\",\"buttonLink\":\"/novidades\",\"active\":true,\"order\":3},{\"id\":\"4\",\"title\":\"PIX Desconto\",\"subtitle\":\"5% OFF no pagamento via PIX\",\"icon\":\"💳\",\"gradient\":\"linear-gradient(135deg, #2563eb, #1d4ed8)\",\"buttonText\":\"Usar PIX\",\"buttonLink\":\"/pix\",\"active\":true,\"order\":4}]','app','Banners do Carrossel','Configuração dos banners promocionais do carrossel da homepage','json','2026-01-12 20:55:33.988','2026-01-13 00:54:09.083'),('cmkbnd0cj003xk0ktknl63xms','app.apiUrl','https://mydshop.com.br/api','app','api Url','Configuração do app: app.apiUrl','text','2026-01-12 21:00:22.899','2026-01-13 00:54:09.084'),('cmkbnd0cj003yk0ktzbqcm11u','app.apiUrlDev','http://localhost:3000/api','app','api Url Dev','Configuração do app: app.apiUrlDev','text','2026-01-12 21:00:22.899','2026-01-13 00:54:09.084'),('cmkbnd0ck003zk0ktwkuch6nu','app.apiUrlProd','https://192.168.3.20/api','app','api Url Prod','Configuração do app: app.apiUrlProd','text','2026-01-12 21:00:22.899','2026-01-13 00:54:09.084'),('cmke4cp9n000g10i9yjpl6511','appearance.backgroundColor','#F3F4F6','aparencia','Cor de Fundo','Cor de fundo das páginas (padrão: cinza claro)','color','2026-01-14 14:31:34.380','2026-01-14 14:31:34.380');
/*!40000 ALTER TABLE `systemconfig` ENABLE KEYS */;
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
-- Table structure for table `packagingbox`
--

DROP TABLE IF EXISTS `packagingbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `packagingbox` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('BOX','ENVELOPE','TUBE','BAG','CUSTOM') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BOX',
  `innerLength` double NOT NULL,
  `innerWidth` double NOT NULL,
  `innerHeight` double NOT NULL,
  `outerLength` double NOT NULL,
  `outerWidth` double NOT NULL,
  `outerHeight` double NOT NULL,
  `emptyWeight` double NOT NULL,
  `maxWeight` double NOT NULL,
  `maxVolume` double DEFAULT NULL,
  `cost` double NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `isDefault` tinyint(1) NOT NULL DEFAULT 0,
  `priority` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packagingbox_code_key` (`code`),
  KEY `packagingbox_isActive_idx` (`isActive`),
  KEY `packagingbox_type_idx` (`type`),
  KEY `packagingbox_priority_idx` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packagingbox`
--

LOCK TABLES `packagingbox` WRITE;
/*!40000 ALTER TABLE `packagingbox` DISABLE KEYS */;
INSERT INTO `packagingbox` VALUES ('cmkcv6g9u0000crw9gg0s0mvp','Envelope Pequeno','A1','ENVELOPE',18,12,3,20,14,4,0.02,0.5,NULL,0.5,1,0,10,'2026-01-13 17:27:00.066','2026-01-13 17:27:00.066'),('cmkcv6ga90001crw9usox8q9e','Envelope Médio','A2','ENVELOPE',28,18,4,30,20,5,0.03,1,NULL,0.8,1,0,20,'2026-01-13 17:27:00.081','2026-01-13 17:27:00.081'),('cmkcv6gag0002crw914xg5s28','Caixa Pequena','B1','BOX',18,13,8,20,15,10,0.1,2,NULL,1.5,1,0,30,'2026-01-13 17:27:00.089','2026-01-13 17:27:00.089'),('cmkcv6gan0003crw99yttuvk7','Caixa Média','B2','BOX',28,18,13,30,20,15,0.15,5,NULL,2.5,1,0,40,'2026-01-13 17:27:00.095','2026-01-13 17:27:00.095'),('cmkcv6gav0004crw9gfbio12u','Caixa Grande','B3','BOX',38,28,18,40,30,20,0.25,10,NULL,4,1,0,50,'2026-01-13 17:27:00.103','2026-01-13 17:27:00.103'),('cmkcv6gb10005crw9hqefw37w','Caixa Extra Grande','C1','BOX',48,38,28,50,40,30,0.4,20,NULL,6,1,0,60,'2026-01-13 17:27:00.109','2026-01-13 17:27:00.109'),('cmkcv6gb50006crw9tsofocog','Caixa Gigante','C2','BOX',58,48,38,60,50,40,0.6,30,NULL,10,1,0,70,'2026-01-13 17:27:00.113','2026-01-13 17:27:00.113'),('cmkcv6gbd0007crw9vvei6cwv','Tubo Pequeno','T1','TUBE',38,8,8,40,10,10,0.1,3,NULL,2,1,0,35,'2026-01-13 17:27:00.121','2026-01-13 17:27:00.121'),('cmkcv6gbi0008crw9wxr3csgr','Tubo Grande','T2','TUBE',78,13,13,80,15,15,0.2,5,NULL,4,1,0,45,'2026-01-13 17:27:00.126','2026-01-13 17:27:00.126');
/*!40000 ALTER TABLE `packagingbox` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shippingrule`
--

DROP TABLE IF EXISTS `shippingrule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shippingrule` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` varchar(191) DEFAULT NULL,
  `regionType` varchar(191) NOT NULL,
  `regions` text NOT NULL,
  `minWeight` double DEFAULT NULL,
  `maxWeight` double DEFAULT NULL,
  `shippingCost` double NOT NULL,
  `costPerKg` double DEFAULT NULL,
  `freeShippingMin` double DEFAULT NULL,
  `deliveryDays` int(11) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `minCartValue` double DEFAULT NULL,
  `maxCartValue` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shippingrule_isActive_idx` (`isActive`),
  KEY `shippingrule_regionType_idx` (`regionType`),
  KEY `shippingrule_priority_idx` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shippingrule`
--

LOCK TABLES `shippingrule` WRITE;
/*!40000 ALTER TABLE `shippingrule` DISABLE KEYS */;
INSERT INTO `shippingrule` VALUES ('cmk7brjut0001jrek05pg82ey','FRETE SÃO LUIS CAPITAL','FRETE GRATIS PARA TODA SÃO LUIS','ZIPCODE_RANGE','[\"65000000-65099999\"]',0.2,5,10,1,99,2,1,10,'2026-01-09 20:24:41.000','2026-01-11 19:43:17.496',99,9999999),('cmka4uzk2000ofdsxh967wgsh','FRETE INTERIOR MARANHÃO','FRETE PARA O INTERIOR ESTADO DO MARANHÃO','STATE','[\"MA\"]',0.1,3,35,5,999,5,1,9,'2026-01-11 19:34:42.817','2026-01-11 19:34:42.817',99,5000);
/*!40000 ALTER TABLE `shippingrule` ENABLE KEYS */;
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
INSERT INTO `product_type` VALUES ('cmk4gi1es0002cxgjx5vp14us','Luminarias','luminarias','','',1,'2026-01-07 20:13:57.028','2026-01-07 20:13:57.028'),('cmk6ynw5z0002xx3ntuzaiznr','Tênis','tenis','','',1,'2026-01-09 14:17:55.607','2026-01-09 14:17:55.607'),('cmk6zec9g000hxx3n5qnvq8d3','Roupas','roupas','','',1,'2026-01-09 14:38:29.524','2026-01-09 14:38:29.524'),('pt1','Livro','livro',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000'),('pt2','Celular','celular',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000'),('pt3','NookBooks','nookbooks','','',1,'2026-01-07 16:40:02.000','2026-01-07 19:41:44.555'),('pt4','Vestußrio','vestuario',NULL,'',1,'2026-01-07 16:40:02.000','2026-01-07 16:40:02.000');
/*!40000 ALTER TABLE `product_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shippingcarrier`
--

DROP TABLE IF EXISTS `shippingcarrier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shippingcarrier` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('OWN','CARRIER','POSTAL','AGGREGATOR') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CARRIER',
  `logo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `isDefault` tinyint(1) NOT NULL DEFAULT 0,
  `apiUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiKey` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiSecret` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiToken` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apiConfig` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contractCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adminCode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderCNPJ` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senderCEP` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `labelFormat` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT 'PDF',
  `labelWidth` double DEFAULT NULL,
  `labelHeight` double DEFAULT NULL,
  `trackingUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `priority` int(11) NOT NULL DEFAULT 0,
  `minWeight` double DEFAULT NULL,
  `maxWeight` double DEFAULT NULL,
  `maxLength` double DEFAULT NULL,
  `maxWidth` double DEFAULT NULL,
  `maxHeight` double DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shippingcarrier_code_key` (`code`),
  KEY `shippingcarrier_isActive_idx` (`isActive`),
  KEY `shippingcarrier_code_idx` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shippingcarrier`
--

LOCK TABLES `shippingcarrier` WRITE;
/*!40000 ALTER TABLE `shippingcarrier` DISABLE KEYS */;
/*!40000 ALTER TABLE `shippingcarrier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shippingservice`
--

DROP TABLE IF EXISTS `shippingservice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shippingservice` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carrierId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minDays` int(11) DEFAULT NULL,
  `maxDays` int(11) DEFAULT NULL,
  `additionalDays` int(11) DEFAULT 0,
  `baseCost` double DEFAULT NULL,
  `costPerKg` double DEFAULT NULL,
  `percentageFee` double DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `maxWeight` double DEFAULT NULL,
  `maxValue` double DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `shippingservice_carrierId_code_key` (`carrierId`,`code`),
  KEY `shippingservice_carrierId_idx` (`carrierId`),
  KEY `shippingservice_isActive_idx` (`isActive`),
  CONSTRAINT `shippingservice_carrierId_fkey` FOREIGN KEY (`carrierId`) REFERENCES `shippingcarrier` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shippingservice`
--

LOCK TABLES `shippingservice` WRITE;
/*!40000 ALTER TABLE `shippingservice` DISABLE KEYS */;
/*!40000 ALTER TABLE `shippingservice` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-15 19:56:00
