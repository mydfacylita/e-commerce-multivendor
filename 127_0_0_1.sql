-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 09-Maio-2025 às 16:14
-- Versão do servidor: 10.4.22-MariaDB
-- versão do PHP: 7.4.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `clinica`
--
CREATE DATABASE IF NOT EXISTS `clinica` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `clinica`;
--
-- Banco de dados: `fs5`
--
CREATE DATABASE IF NOT EXISTS `fs5` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `fs5`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `arquivos`
--

CREATE TABLE `arquivos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `Ano` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comp` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `municipio` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_arquivos` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `obs` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `acao` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `siatuacao` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` int(11) NOT NULL,
  `file` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` int(11) NOT NULL,
  `n_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `modelo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `org_emissao` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nota` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user` int(11) NOT NULL,
  `e_mail` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prazo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `autor` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `solicitado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `P_detect` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` datetime NOT NULL,
  `nota_conlu` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `servico` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `arquivos`
--

INSERT INTO `arquivos` (`id`, `Ano`, `comp`, `municipio`, `nome_arquivos`, `obs`, `acao`, `siatuacao`, `status`, `file`, `tipo`, `n_documento`, `modelo`, `org_emissao`, `nota`, `user`, `e_mail`, `telefone`, `prazo`, `autor`, `solicitado`, `P_detect`, `data`, `nota_conlu`, `servico`) VALUES
(34, '2025', 'valor_padrao', 'PREFEITURA MUNICIPAL DE SANTA FILOMENA DO MARANHÃO', '', 'FEITO COM SUCESSO', '', '1', 1, NULL, 1, '1-08/05/2025-2025', '', '', '', 2, '', '', '', 'Dynaria Carvalho Ribeiro', 'MARIA DIAS DA SILVA', '', '2025-05-08 19:18:41', '', 'SOLICITAÇÃO DE ARQUIVOS 2025'),
(35, '2025', 'valor_padrao', 'PREFEITURA MUNICIPAL DE SANTA FILOMENA DO MARANHÃO', '', 'Solução de Arquivos', '', '', 2, NULL, 1, '35202508052025', '', '', '', 2, '', '', '', 'Dynaria Carvalho Ribeiro', 'MISAEL FEITOZA RIBEIRO', '', '2025-05-08 19:30:39', '', 'SOLICTAÇÃO DE DOCUMENTOS'),
(36, '2025', 'valor_padrao', 'PREFEITURA MUNICIPAL DE SANTA FILOMENA DO MARANHÃO', '', 'ok', '', '', 2, NULL, 1, '36202508052025', '', '', '', 2, '', '', '', 'Dynaria Carvalho Ribeiro', 'MISAEL FEITOZA RIBEIRO', '', '2025-05-08 22:38:19', '', 'solicitação de documentação');

-- --------------------------------------------------------

--
-- Estrutura da tabela `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2019_08_19_000000_create_failed_jobs_table', 1),
(4, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(5, '2025_05_07_204001_create_arquivos_table', 2),
(6, '2025_05_07_223741_add_servico_to_arquivos_table', 3),
(7, '2025_05_08_140236_solicitacao_arquivos', 4),
(8, '2025_05_08_144835_alter_ano_nullable_on_arquivos_table', 5),
(9, '2025_05_09_003439_add_role_to_users_table', 6);

-- --------------------------------------------------------

--
-- Estrutura da tabela `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `solicitacao_arquivos`
--

CREATE TABLE `solicitacao_arquivos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `solicitacao_id` bigint(20) UNSIGNED NOT NULL,
  `arquivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `solicitacao_arquivos`
--

INSERT INTO `solicitacao_arquivos` (`id`, `solicitacao_id`, `arquivo`, `created_at`, `updated_at`) VALUES
(50, 34, 'anexos/681d03d126342_681cefc3057b5_piso-enfermagem - 2025-05-07T181355.781.xlsx', '2025-05-08 22:19:45', '2025-05-08 22:19:45'),
(51, 34, 'anexos/681d03d129a4a_681cd645a6b71_681ccf242eab4_piso-enfermagem - 2025-05-07T181717.909 (1).xlsx', '2025-05-08 22:19:45', '2025-05-08 22:19:45'),
(52, 34, 'anexos/681d03d12a896_681ccf242eab4_piso-enfermagem - 2025-05-07T181717.909 (1).xlsx', '2025-05-08 22:19:45', '2025-05-08 22:19:45'),
(53, 34, 'anexos/681d03d12b5e2_piso-enfermagem - 2025-05-07T181343.837.xlsx', '2025-05-08 22:19:45', '2025-05-08 22:19:45'),
(54, 34, 'anexos/681d03d12c652_RelatorioSituacaoFiscal-24223868000119-20250428.pdf', '2025-05-08 22:19:45', '2025-05-08 22:19:45'),
(58, 35, 'anexos/681d0c6db35c8_681d03d126342_681cefc3057b5_piso-enfermagem - 2025-05-07T181355.781.xlsx', '2025-05-08 22:56:29', '2025-05-08 22:56:29'),
(59, 35, 'anexos/681d0c6db5e6a_724432153804139.pdf', '2025-05-08 22:56:29', '2025-05-08 22:56:29'),
(64, 36, 'anexos/681d325b208ac_Contrato - 28 19 - Barreirinhas.pdf', '2025-05-09 01:38:19', '2025-05-09 01:38:19'),
(65, 36, 'anexos/681d325b24b1d_1746311987403-extrato-34651.pdf', '2025-05-09 01:38:19', '2025-05-09 01:38:19'),
(66, 35, 'anexos/681d433e74d53_documento_assinado_36_65 (1).pdf', '2025-05-09 02:50:22', '2025-05-09 02:50:22'),
(67, 35, 'anexos/681d44bce85a5_documento_assinado_35_59 (1).pdf', '2025-05-09 02:56:44', '2025-05-09 02:56:44'),
(68, 35, 'anexos/681d44bd099db_documento_assinado_35_59 (1).pdf', '2025-05-09 02:56:45', '2025-05-09 02:56:45'),
(69, 34, 'anexos/681d52727fce1_documento_assinado_36_65.pdf', '2025-05-09 03:55:14', '2025-05-09 03:55:14'),
(70, 35, 'anexos/681d528212eda_documento_assinado_35_59 (1).pdf', '2025-05-09 03:55:30', '2025-05-09 03:55:30'),
(71, 35, 'anexos/681d52a62a60b_Wa7cQ2WPa3YTg0F9XpsslwpQYh3eFZmSDTNaD5Wo.bin', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(72, 35, 'anexos/681d52a62d56d_681ccf242eab4_piso-enfermagem - 2025-05-07T181717.909.xlsx', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(73, 35, 'anexos/681d52a62e610_documento_assinado_35_59 (1) - Copia.pdf', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(74, 35, 'anexos/681d52a62f50b_681d0c6db35c8_681d03d126342_681cefc3057b5_piso-enfermagem - 2025-05-07T181355.781 - Copia.xlsx', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(75, 35, 'anexos/681d52a632519_documento_assinado_36_65 (1) - Copia.pdf', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(76, 35, 'anexos/681d52a633b25_documento_assinado_36_65 - Copia.pdf', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(77, 35, 'anexos/681d52a634b23_documento_assinado_35_59 (2) - Copia.pdf', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(78, 35, 'anexos/681d52a635963_documento_assinado_35_59 (1) - Copia - Copia.pdf', '2025-05-09 03:56:06', '2025-05-09 03:56:06'),
(79, 36, 'anexos/681d537200e41_Resolucao_das_OCI_26_de_marco_2025_assinado.pdf', '2025-05-09 03:59:30', '2025-05-09 03:59:30'),
(80, 35, 'anexos/681d7538be954_Declaração de Posse do Terreno UBS Santa Maria - Mala Direta (1).pdf', '2025-05-09 06:23:37', '2025-05-09 06:23:37'),
(81, 36, 'anexos/681d7b9a4b8c0_documento_assinado_36_65 (1).pdf', '2025-05-09 06:50:50', '2025-05-09 06:50:50'),
(82, 36, 'anexos/681d7c3d6b508_documento_assinado_36_65 (1) - Copia - Copia.pdf', '2025-05-09 06:53:33', '2025-05-09 06:53:33'),
(83, 36, 'anexos/681d7c3d6e6f0_documento_assinado_36_65 (1) - Copia.pdf', '2025-05-09 06:53:33', '2025-05-09 06:53:33'),
(84, 36, 'anexos/681d7c3d6fd54_documento_assinado_36_65 (1).pdf', '2025-05-09 06:53:33', '2025-05-09 06:53:33'),
(85, 36, 'anexos/681d7c3d70bcd_documento_assinado_36_65 - Copia - Copia.pdf', '2025-05-09 06:53:33', '2025-05-09 06:53:33');

-- --------------------------------------------------------

--
-- Estrutura da tabela `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`, `role`) VALUES
(1, 'MISAEL FEITOZA RIBEIRO', 'misael_ribeiro@hotmail.com', NULL, '$2y$10$TfLv1cW9pCKeR/ddRFMweuM/dY3YuRTj8.zeVNLWJIGRcEqmMS7p6', NULL, '2025-05-08 01:35:21', '2025-05-08 01:35:21', 'admin'),
(2, 'Dynaria Carvalho Ribeiro', 'dynariaribeiro2020@gmail.com', NULL, '$2y$10$DjPO5oXKDoSyA2E6iMQW/OACvmVEI4LCsraS3qlgqptLb8lJ/LVSS', NULL, '2025-05-08 19:25:32', '2025-05-08 19:25:32', 'gestor');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `arquivos`
--
ALTER TABLE `arquivos`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Índices para tabela `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Índices para tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Índices para tabela `solicitacao_arquivos`
--
ALTER TABLE `solicitacao_arquivos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `solicitacao_arquivos_solicitacao_id_foreign` (`solicitacao_id`);

--
-- Índices para tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `arquivos`
--
ALTER TABLE `arquivos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT de tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `solicitacao_arquivos`
--
ALTER TABLE `solicitacao_arquivos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=86;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `solicitacao_arquivos`
--
ALTER TABLE `solicitacao_arquivos`
  ADD CONSTRAINT `solicitacao_arquivos_solicitacao_id_foreign` FOREIGN KEY (`solicitacao_id`) REFERENCES `arquivos` (`id`) ON DELETE CASCADE;
--
-- Banco de dados: `pab`
--
CREATE DATABASE IF NOT EXISTS `pab` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `pab`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `bd_prefs`
--

CREATE TABLE `bd_prefs` (
  `id` int(11) NOT NULL,
  `cod_pref` int(11) NOT NULL,
  `nome_bd` varchar(255) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `bd_prefs`
--

INSERT INTO `bd_prefs` (`id`, `cod_pref`, `nome_bd`, `status`) VALUES
(1, 1, 'icatu', 1),
(2, 2, 'sao_domingos', 1),
(3, 0, 'SEM PREFEITURA', 0),
(4, 3, 'dom_pedro', 1),
(5, 4, 'senador', 1),
(6, 5, 'pedreiras', 1),
(7, 6, 'porto_rico', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2019_08_19_000000_create_failed_jobs_table', 1),
(4, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(5, '2023_10_18_223824_create_permission_tables', 2);

-- --------------------------------------------------------

--
-- Estrutura da tabela `model_has_permissions`
--

CREATE TABLE `model_has_permissions` (
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `model_has_permissions`
--

INSERT INTO `model_has_permissions` (`permission_id`, `model_type`, `model_id`) VALUES
(1, 'App\\Models\\User', 19);

-- --------------------------------------------------------

--
-- Estrutura da tabela `model_has_roles`
--

CREATE TABLE `model_has_roles` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `password_resets`
--

INSERT INTO `password_resets` (`email`, `token`, `created_at`) VALUES
('misa@ig.com.br', '$2y$10$2CdIuKKjXePwfHXslXtvp.UIkgR6BHzXxLwdrCdCx.5M2uADo6Iva', '2023-05-31 17:14:03'),
('thiagox2-@hotmail.com', '$2y$10$.21csTvV2gSvWJ08wrfipenTrOlcKhoCeBABbWdJEH0qkbrr8TUgK', '2023-08-02 16:15:10'),
('thiagosung@gmail.com', '$2y$10$qBtstBS0OL/YjPiNx0pzn.YIIkjitjNy5GYUjxn4fVToibREb8QGK', '2023-08-02 17:08:17'),
('misael_ribeiro@hotmail.com', '$2y$10$n04T6iGISDexq765A5m5GeL2o4/CcjqIpoNjwt77ZHBw0fq3oJhDS', '2024-02-28 00:02:22');

-- --------------------------------------------------------

--
-- Estrutura da tabela `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `guard_name`, `created_at`, `updated_at`) VALUES
(1, 'user', 'web', '2023-10-19 01:50:35', '2023-10-19 01:50:35'),
(2, 'admin', 'web', '2023-10-19 01:50:43', '2023-10-19 01:50:43');

-- --------------------------------------------------------

--
-- Estrutura da tabela `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `prefs`
--

CREATE TABLE `prefs` (
  `id` int(11) NOT NULL,
  `cod_pref` int(11) NOT NULL,
  `nome_pref` varchar(255) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `prefs`
--

INSERT INTO `prefs` (`id`, `cod_pref`, `nome_pref`, `status`) VALUES
(0, 5, 'PREFEITURA MUNICIPAL DE PEDREIRAS', 1),
(1, 2, 'PREFEITURA MUNICIPAL DE SÃO DOMINGOS', 1),
(2, 0, 'SEM PREFEITURA', 0),
(3, 3, 'PREFEITURA DE DOM PEDRO', 1),
(4, 4, 'PREFEITURA MUNICIPAL DE SENADOR ALEXANDRE COSTA', 1),
(6, 6, 'PREFEITURA MUNICIPAL DE PORTO RICO DO MARANHÃO', 1);

-- --------------------------------------------------------

--
-- Estrutura da tabela `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `role_has_permissions`
--

CREATE TABLE `role_has_permissions` (
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cod_pref` int(11) NOT NULL,
  `permisao` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `users`
--

INSERT INTO `users` (`id`, `cod_pref`, `permisao`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(3, 2, '1,2,3,4', 'MISAEL FEITOZA RIBEIRO', 'misael_ribeiro@hotmail.com', NULL, '$2y$10$KrHxBlkCrIjSDcSX4GD/Q.LJsrNwEWcQLhjEO7fBu3Gj2Plo0cmRu', NULL, '2023-02-13 17:57:30', '2023-02-13 17:57:30'),
(6, 3, '0', 'MISAEL FEITOZA RIBEIRO', 'misa@ig.com.br', NULL, '$2y$10$7t4k4eKtg2gOhusROt5HYOIS6wjS2H12H7yC6QmJsWsHPjd8sElyW', NULL, '2023-03-07 00:59:34', '2023-03-07 00:59:34'),
(7, 4, '0', 'SECRETARIA MUNICIPAL DE SAÚDE DE SENADOR ALEXANDRE COSTA', 'senador@myd.com.br', NULL, '$2y$10$3H4orhd2NC2WvgKs5fYmbu0DGjJ9H5irBPxpQIChs2VxenXvTalSm', NULL, '2023-03-07 17:02:05', '2023-03-07 17:02:05'),
(8, 2, '0', 'SECRETARIA MUNICIPAL DE SAÚDE DE SÃO DOMINGOS DO MARANHÃO', 'saodomingos@myd.com.br', NULL, '$2y$10$mfZoDbA.L1zxCj4NaoBtUuiw4f9EtFUdtPQRDkgt6RvtU795yous2', 'oGMO28IN4b7of8zOmIub0YhNIwenln58mhXl3nFFIdtO4sz86PqxPF29bnDi', '2023-03-07 21:11:07', '2023-03-07 21:11:07'),
(9, 3, '0', 'SECRETARIA MUNICIPAL DE SAÚDE DE DOM PEDRO', 'dompedro@myd.com.br', NULL, '$2y$10$fYYRWqBOB0kUBbnq2eK.xeGEeJ274GIa6aRzSoFYJRS1wYNwdSP2S', 'RrkkEH8GMOPvxuMAihElqlGbmYMnMKiuofzHcPQm2N7XCLPvOnDmWBYsMBGb', '2023-03-20 13:23:19', '2023-03-20 13:23:19'),
(10, 3, '0', 'ANTÔNIO THIAGO ARAUJO DE ALMEIDA - DOM PEDRO', 'thiagosung@gmail.com', NULL, '$2y$10$cGb5VDLyNgxb5Anlm.IoQuNO0uiMcXpGRJSG3GrOe6u5iaWRuVide', 'S6cbxKtqALVLItJIEYwuYLYh1ZstYvz3FSZx268sJIVcOJleR62UZnVQVqB5', '2023-03-29 00:49:11', '2023-03-29 00:49:11'),
(12, 2, '0', 'ANTÔNIO THIAGO ARAUJO DE ALMEIDA - SÃO DOMINGOS DO MARANHÃO', 'thiagox2-@hotmail.com', NULL, '$2y$10$cGb5VDLyNgxb5Anlm.IoQuNO0uiMcXpGRJSG3GrOe6u5iaWRuVide', 'xmdcccZWELlnIt1Piz4j0A2iMihW6KVfmCOggBvy4NzsoiHp4odvAD51Mj5I', '2023-03-29 01:09:54', '2023-03-29 01:09:54'),
(15, 5, '0', 'MISAEL FEITOZA RIBEIRO', 'pedreiras@pedreiras.com.br', NULL, '$2y$10$OnTF.gCsg9t9kClyxUq5ue5dkulGiASvCHvYrBYd9gUgWavdEum3u', 'zCVsu7xYqhqnIdWsQWdHmPMj1KOpk8Skpq4vdE74gUhSH8Aq1a9pRZIIgJsB', '2023-05-24 14:33:38', '2023-05-24 14:33:38'),
(16, 5, '0', 'Samuel Rodrigues da Silva - Pedreiras', 'samuellpedreirense@hotmail.com', NULL, '$2y$10$YtvCOvpENO6Pts12.Sm8k.5FbEOWBWfiVpVljmYuyJJIFDjiHtn8O', NULL, '2023-05-24 14:41:01', '2023-05-24 14:41:01'),
(17, 6, '0', 'JOSE PEREIRA DA SILVA NETO - SEMUS DE PORTO RICO DO MARANHÃO', 'netopereira.enf@gmail.com', NULL, '$2y$10$J5BrSh7E7jRMPTTNkx6gBuuWJ.TQtb7T1Qnc5ZIPL9801Do8WOlCS', 'GXFwAT2Bfmdpx52KlfNRORfxpXMmwu5cxhd513ryo2MSgm0QrDdFcXGV1M2w', '2023-05-29 20:59:38', '2023-05-29 20:59:38'),
(19, 2, '0', 'MISAEL FEITOZA RIBEIRO', 'misael_can@gmail.com', NULL, '$2y$10$x5CRaCKKUs/t1Ypm3tA3q./fFG0kvOZ7cx.phVbhickFkEjuXRaB6', NULL, '2023-10-19 02:31:35', '2023-10-19 02:31:35');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `bd_prefs`
--
ALTER TABLE `bd_prefs`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Índices para tabela `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `model_has_permissions`
--
ALTER TABLE `model_has_permissions`
  ADD PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  ADD KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`);

--
-- Índices para tabela `model_has_roles`
--
ALTER TABLE `model_has_roles`
  ADD PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  ADD KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`);

--
-- Índices para tabela `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Índices para tabela `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`);

--
-- Índices para tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Índices para tabela `prefs`
--
ALTER TABLE `prefs`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`);

--
-- Índices para tabela `role_has_permissions`
--
ALTER TABLE `role_has_permissions`
  ADD PRIMARY KEY (`permission_id`,`role_id`),
  ADD KEY `role_has_permissions_role_id_foreign` (`role_id`);

--
-- Índices para tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `bd_prefs`
--
ALTER TABLE `bd_prefs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `prefs`
--
ALTER TABLE `prefs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de tabela `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- Restrições para despejos de tabelas
--

--
-- Limitadores para a tabela `model_has_permissions`
--
ALTER TABLE `model_has_permissions`
  ADD CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `model_has_roles`
--
ALTER TABLE `model_has_roles`
  ADD CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Limitadores para a tabela `role_has_permissions`
--
ALTER TABLE `role_has_permissions`
  ADD CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;
--
-- Banco de dados: `phpmyadmin`
--
CREATE DATABASE IF NOT EXISTS `phpmyadmin` DEFAULT CHARACTER SET utf8 COLLATE utf8_bin;
USE `phpmyadmin`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__bookmark`
--

CREATE TABLE `pma__bookmark` (
  `id` int(10) UNSIGNED NOT NULL,
  `dbase` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '',
  `user` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '',
  `label` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `query` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Bookmarks';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__central_columns`
--

CREATE TABLE `pma__central_columns` (
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `col_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `col_type` varchar(64) COLLATE utf8_bin NOT NULL,
  `col_length` text COLLATE utf8_bin DEFAULT NULL,
  `col_collation` varchar(64) COLLATE utf8_bin NOT NULL,
  `col_isNull` tinyint(1) NOT NULL,
  `col_extra` varchar(255) COLLATE utf8_bin DEFAULT '',
  `col_default` text COLLATE utf8_bin DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Central list of columns';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__column_info`
--

CREATE TABLE `pma__column_info` (
  `id` int(5) UNSIGNED NOT NULL,
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `column_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `comment` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `mimetype` varchar(255) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `transformation` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '',
  `transformation_options` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '',
  `input_transformation` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT '',
  `input_transformation_options` varchar(255) COLLATE utf8_bin NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Column information for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__designer_settings`
--

CREATE TABLE `pma__designer_settings` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `settings_data` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Settings related to Designer';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__export_templates`
--

CREATE TABLE `pma__export_templates` (
  `id` int(5) UNSIGNED NOT NULL,
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `export_type` varchar(10) COLLATE utf8_bin NOT NULL,
  `template_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `template_data` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved export templates';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__favorite`
--

CREATE TABLE `pma__favorite` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `tables` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Favorite tables';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__history`
--

CREATE TABLE `pma__history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `db` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `table` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp(),
  `sqlquery` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='SQL history for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__navigationhiding`
--

CREATE TABLE `pma__navigationhiding` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `item_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `item_type` varchar(64) COLLATE utf8_bin NOT NULL,
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Hidden items of navigation tree';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__pdf_pages`
--

CREATE TABLE `pma__pdf_pages` (
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `page_nr` int(10) UNSIGNED NOT NULL,
  `page_descr` varchar(50) CHARACTER SET utf8 NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='PDF relation pages for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__recent`
--

CREATE TABLE `pma__recent` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `tables` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Recently accessed tables';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__relation`
--

CREATE TABLE `pma__relation` (
  `master_db` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `master_table` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `master_field` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `foreign_db` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `foreign_table` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `foreign_field` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Relation table';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__savedsearches`
--

CREATE TABLE `pma__savedsearches` (
  `id` int(5) UNSIGNED NOT NULL,
  `username` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `search_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `search_data` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Saved searches';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__table_coords`
--

CREATE TABLE `pma__table_coords` (
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `pdf_page_number` int(11) NOT NULL DEFAULT 0,
  `x` float UNSIGNED NOT NULL DEFAULT 0,
  `y` float UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table coordinates for phpMyAdmin PDF output';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__table_info`
--

CREATE TABLE `pma__table_info` (
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT '',
  `display_field` varchar(64) COLLATE utf8_bin NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Table information for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__table_uiprefs`
--

CREATE TABLE `pma__table_uiprefs` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `prefs` text COLLATE utf8_bin NOT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Tables'' UI preferences';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__tracking`
--

CREATE TABLE `pma__tracking` (
  `db_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `table_name` varchar(64) COLLATE utf8_bin NOT NULL,
  `version` int(10) UNSIGNED NOT NULL,
  `date_created` datetime NOT NULL,
  `date_updated` datetime NOT NULL,
  `schema_snapshot` text COLLATE utf8_bin NOT NULL,
  `schema_sql` text COLLATE utf8_bin DEFAULT NULL,
  `data_sql` longtext COLLATE utf8_bin DEFAULT NULL,
  `tracking` set('UPDATE','REPLACE','INSERT','DELETE','TRUNCATE','CREATE DATABASE','ALTER DATABASE','DROP DATABASE','CREATE TABLE','ALTER TABLE','RENAME TABLE','DROP TABLE','CREATE INDEX','DROP INDEX','CREATE VIEW','ALTER VIEW','DROP VIEW') COLLATE utf8_bin DEFAULT NULL,
  `tracking_active` int(1) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Database changes tracking for phpMyAdmin';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__userconfig`
--

CREATE TABLE `pma__userconfig` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `timevalue` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `config_data` text COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User preferences storage for phpMyAdmin';

--
-- Extraindo dados da tabela `pma__userconfig`
--

INSERT INTO `pma__userconfig` (`username`, `timevalue`, `config_data`) VALUES
('root', '2019-10-21 13:37:09', '{\"Console\\/Mode\":\"collapse\"}');

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__usergroups`
--

CREATE TABLE `pma__usergroups` (
  `usergroup` varchar(64) COLLATE utf8_bin NOT NULL,
  `tab` varchar(64) COLLATE utf8_bin NOT NULL,
  `allowed` enum('Y','N') COLLATE utf8_bin NOT NULL DEFAULT 'N'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='User groups with configured menu items';

-- --------------------------------------------------------

--
-- Estrutura da tabela `pma__users`
--

CREATE TABLE `pma__users` (
  `username` varchar(64) COLLATE utf8_bin NOT NULL,
  `usergroup` varchar(64) COLLATE utf8_bin NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin COMMENT='Users and their assignments to user groups';

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `pma__bookmark`
--
ALTER TABLE `pma__bookmark`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `pma__central_columns`
--
ALTER TABLE `pma__central_columns`
  ADD PRIMARY KEY (`db_name`,`col_name`);

--
-- Índices para tabela `pma__column_info`
--
ALTER TABLE `pma__column_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `db_name` (`db_name`,`table_name`,`column_name`);

--
-- Índices para tabela `pma__designer_settings`
--
ALTER TABLE `pma__designer_settings`
  ADD PRIMARY KEY (`username`);

--
-- Índices para tabela `pma__export_templates`
--
ALTER TABLE `pma__export_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `u_user_type_template` (`username`,`export_type`,`template_name`);

--
-- Índices para tabela `pma__favorite`
--
ALTER TABLE `pma__favorite`
  ADD PRIMARY KEY (`username`);

--
-- Índices para tabela `pma__history`
--
ALTER TABLE `pma__history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `username` (`username`,`db`,`table`,`timevalue`);

--
-- Índices para tabela `pma__navigationhiding`
--
ALTER TABLE `pma__navigationhiding`
  ADD PRIMARY KEY (`username`,`item_name`,`item_type`,`db_name`,`table_name`);

--
-- Índices para tabela `pma__pdf_pages`
--
ALTER TABLE `pma__pdf_pages`
  ADD PRIMARY KEY (`page_nr`),
  ADD KEY `db_name` (`db_name`);

--
-- Índices para tabela `pma__recent`
--
ALTER TABLE `pma__recent`
  ADD PRIMARY KEY (`username`);

--
-- Índices para tabela `pma__relation`
--
ALTER TABLE `pma__relation`
  ADD PRIMARY KEY (`master_db`,`master_table`,`master_field`),
  ADD KEY `foreign_field` (`foreign_db`,`foreign_table`);

--
-- Índices para tabela `pma__savedsearches`
--
ALTER TABLE `pma__savedsearches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `u_savedsearches_username_dbname` (`username`,`db_name`,`search_name`);

--
-- Índices para tabela `pma__table_coords`
--
ALTER TABLE `pma__table_coords`
  ADD PRIMARY KEY (`db_name`,`table_name`,`pdf_page_number`);

--
-- Índices para tabela `pma__table_info`
--
ALTER TABLE `pma__table_info`
  ADD PRIMARY KEY (`db_name`,`table_name`);

--
-- Índices para tabela `pma__table_uiprefs`
--
ALTER TABLE `pma__table_uiprefs`
  ADD PRIMARY KEY (`username`,`db_name`,`table_name`);

--
-- Índices para tabela `pma__tracking`
--
ALTER TABLE `pma__tracking`
  ADD PRIMARY KEY (`db_name`,`table_name`,`version`);

--
-- Índices para tabela `pma__userconfig`
--
ALTER TABLE `pma__userconfig`
  ADD PRIMARY KEY (`username`);

--
-- Índices para tabela `pma__usergroups`
--
ALTER TABLE `pma__usergroups`
  ADD PRIMARY KEY (`usergroup`,`tab`,`allowed`);

--
-- Índices para tabela `pma__users`
--
ALTER TABLE `pma__users`
  ADD PRIMARY KEY (`username`,`usergroup`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `pma__bookmark`
--
ALTER TABLE `pma__bookmark`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pma__column_info`
--
ALTER TABLE `pma__column_info`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pma__export_templates`
--
ALTER TABLE `pma__export_templates`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pma__history`
--
ALTER TABLE `pma__history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pma__pdf_pages`
--
ALTER TABLE `pma__pdf_pages`
  MODIFY `page_nr` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `pma__savedsearches`
--
ALTER TABLE `pma__savedsearches`
  MODIFY `id` int(5) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- Banco de dados: `test`
--
CREATE DATABASE IF NOT EXISTS `test` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `test`;
--
-- Banco de dados: `tfd`
--
CREATE DATABASE IF NOT EXISTS `tfd` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `tfd`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `estabelecimentos`
--

CREATE TABLE `estabelecimentos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnes` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cnpj` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cep` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `estabelecimentos`
--

INSERT INTO `estabelecimentos` (`id`, `nome`, `cnes`, `cnpj`, `endereco`, `cidade`, `estado`, `cep`, `created_at`, `updated_at`) VALUES
(1, 'Hospital Central Municipal', '1234567', '00.000.000/0001-00', 'Rua Principal, 100', 'Cidade Exemplo', 'SP', '12345-000', '2025-05-07 07:41:07', '2025-05-07 07:41:07'),
(2, 'Clínica Saúde e Bem Estar', '7654321', '11.111.111/0001-11', 'Avenida Secundária, 250', 'Outra Cidade', 'RJ', '54321-000', '2025-05-07 07:41:07', '2025-05-07 07:41:07'),
(3, 'Posto de Saúde Bairro Feliz', '1122334', '22.222.222/0001-22', 'Travessa das Flores, S/N', 'Cidade Exemplo', 'SP', '12345-010', '2025-05-07 07:41:07', '2025-05-07 07:41:07');

-- --------------------------------------------------------

--
-- Estrutura da tabela `estados`
--

CREATE TABLE `estados` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigla` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `estados`
--

INSERT INTO `estados` (`id`, `nome`, `sigla`, `created_at`, `updated_at`) VALUES
(1, 'Acre', 'AC', NULL, NULL),
(2, 'Alagoas', 'AL', NULL, NULL),
(3, 'São Paulo', 'SP', NULL, NULL),
(4, 'Tocantins', 'TO', NULL, NULL);

-- --------------------------------------------------------

--
-- Estrutura da tabela `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `medicos`
--

CREATE TABLE `medicos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estabelecimento_id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` varchar(14) COLLATE utf8mb4_unicode_ci NOT NULL,
  `crm` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cns` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `especialidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cep` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(2) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `medicos`
--

INSERT INTO `medicos` (`id`, `codigo`, `estabelecimento_id`, `nome`, `cpf`, `crm`, `cns`, `especialidade`, `cep`, `endereco`, `estado`, `cidade`, `created_at`, `updated_at`) VALUES
(1, '04114', 1, 'MARIA DA SILVA DINIZ', '278.502.343-91', '141214-MA', '140815221421', 'MEDICO GENECOLOGISTA', '65059820', 'RUA 31 DE MARÇO 05', 'AC', 'São Luís', '2025-05-07 07:42:20', '2025-05-07 07:56:06'),
(2, '124115', 2, 'DANIEL DA SILVA DINIZ', '01940069300', '151144-PI', '2514511411', 'MEDICO CLINICO', '65763000', 'RUA 31 DE MARÇO 05', 'AL', 'SAO LUIS', '2025-05-07 08:19:46', '2025-05-07 08:19:46');

-- --------------------------------------------------------

--
-- Estrutura da tabela `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2019_08_19_000000_create_failed_jobs_table', 1),
(4, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(5, '2025_05_06_200300_create_pacientes_table', 1),
(6, '2025_05_06_210824_add_campos_extra_to_pacientes_table', 2),
(7, '2025_05_06_211619_create_estados_table', 2),
(8, '2025_05_07_032049_create_estabelecimentos_table', 3);

-- --------------------------------------------------------

--
-- Estrutura da tabela `pacientes`
--

CREATE TABLE `pacientes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nome` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cns` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  `cep` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cidade` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `pacientes`
--

INSERT INTO `pacientes` (`id`, `nome`, `cpf`, `cns`, `email`, `telefone`, `data_nascimento`, `cep`, `endereco`, `cidade`, `estado`, `created_at`, `updated_at`) VALUES
(1, 'MISAEL FEITOZA RIBEIRO', '019.400.693-00', '140815221421', 'misael_ribeiro@hotmail.com', '98991269315', '1985-11-13', '65059820', 'rua do retiro natal, BL 04 APT 102', 'São Luís', 'AC', '2025-05-07 08:07:31', '2025-05-07 08:07:49');

-- --------------------------------------------------------

--
-- Estrutura da tabela `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Extraindo dados da tabela `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'MISAEL FEITOZA RIBEIRO', 'misael_ribeiro@hotmail.com', NULL, '$2y$10$1cx0/vBj/z3qubQWjgeUIexmjc4bvFHm34u3xkboqGJs2WAsTz8ii', 'l71VhxbHVmxeW3aaMc6kwsqkB60Cq2imrwBF00a3jMKGDibHKB2PwvrnV88m', '2025-05-07 08:06:31', '2025-05-07 16:18:29');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `estabelecimentos`
--
ALTER TABLE `estabelecimentos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `estabelecimentos_cnes_unique` (`cnes`);

--
-- Índices para tabela `estados`
--
ALTER TABLE `estados`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Índices para tabela `medicos`
--
ALTER TABLE `medicos`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `pacientes`
--
ALTER TABLE `pacientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pacientes_email_unique` (`email`);

--
-- Índices para tabela `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Índices para tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Índices para tabela `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `estabelecimentos`
--
ALTER TABLE `estabelecimentos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `estados`
--
ALTER TABLE `estados`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de tabela `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `medicos`
--
ALTER TABLE `medicos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `pacientes`
--
ALTER TABLE `pacientes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de tabela `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
--
-- Banco de dados: `verific`
--
CREATE DATABASE IF NOT EXISTS `verific` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `verific`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `cad_pref`
--

CREATE TABLE `cad_pref` (
  `id` int(11) NOT NULL,
  `cod_pref` int(11) NOT NULL,
  `cnpj` varchar(25) NOT NULL,
  `nome_pref` varchar(220) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Estrutura da tabela `tb_cnes_prof`
--

CREATE TABLE `tb_cnes_prof` (
  `id` int(11) NOT NULL,
  `cod_pref` int(11) NOT NULL,
  `cbo` varchar(220) NOT NULL,
  `cpf` varchar(20) NOT NULL,
  `nome` varchar(220) NOT NULL,
  `h_amb` int(11) NOT NULL,
  `h_hosp` int(11) NOT NULL,
  `h_outro` int(11) NOT NULL,
  `h_total` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `tb_cnes_prof`
--

INSERT INTO `tb_cnes_prof` (`id`, `cod_pref`, `cbo`, `cpf`, `nome`, `h_amb`, `h_hosp`, `h_outro`, `h_total`) VALUES
(223, 2, '223505-ENFERMEIRO', '', '', 0, 0, 0, 0),
(224, 2, '', '65412087353', 'ALEXANDRE LUCENA GUEDES AGUIAR', 20, 0, 0, 20),
(225, 2, '', '01812593384', 'ANA PAULA DE LIMA SILVA DINIZ', 40, 0, 0, 40),
(226, 2, '', '03596991382', 'ANTONIA MAYARA BARROS DA SILVA', 40, 0, 0, 40),
(227, 2, '', '29252989315', 'EUSA BEZERRA ROCHA REGES', 40, 0, 0, 40),
(228, 2, '', '26730033800', 'MARIA MISTE OLIVEIRA DA SILVA', 10, 0, 0, 10),
(229, 2, '', '02277261386', 'THYAGO ANDRADE DE SOUSA', 0, 0, 20, 20),
(230, 2, '223565-ENFERMEIRO DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(231, 2, '', '64595560249', 'CILMA MARIA FREIRE DA COSTA', 40, 0, 0, 40),
(232, 2, '', '04961904317', 'KELLY REGINA MENEZES MENDONCA', 40, 0, 0, 40),
(233, 2, '', '61602985340', 'PAULO TAFFNER LIMA CAMARA', 40, 0, 0, 40),
(234, 2, '', '00338084304', 'ROSIANA RODRIGUES TEIXEIRA DE ALENCAR', 30, 0, 0, 30),
(235, 2, '322205-TECNICO DE ENFERMAGEM', '', '', 0, 0, 0, 0),
(236, 2, '', '03228261360', 'ANTONIO COSTA DA SILVA', 40, 0, 0, 40),
(237, 2, '', '05141479382', 'DANILO SILVA DE SOUZA', 40, 0, 0, 40),
(238, 2, '', '24268011315', 'DOMINGOS RODRIGUES COSTA', 40, 0, 0, 40),
(239, 2, '', '95954198187', 'FRANCINEIDE GONCALVES DE SOUSA', 40, 0, 0, 40),
(240, 2, '', '00224527371', 'FRANCISCA DA CHAGA FERREIRA LEITE', 40, 0, 0, 40),
(241, 2, '', '06769009331', 'JOSEANES DE CASTRO ALMEIDA', 20, 0, 0, 20),
(242, 2, '', '93110286300', 'KARIANE AMORIM DA COSTA', 40, 0, 0, 40),
(243, 2, '', '60801574382', 'LETICIA DE KASSIA PEREIRA DA COSTA', 20, 0, 0, 20),
(244, 2, '', '00692210300', 'MARIA CELIA PINHO DA SILVA', 40, 0, 0, 40),
(245, 2, '', '84494077372', 'MARIA DO SOCORRO QUEIROZ DOS SANTOS', 20, 0, 0, 20),
(246, 2, '', '60194346307', 'MARILEIDE MELO DE OLIVEIRA SILVA', 40, 0, 0, 40),
(247, 2, '', '02824804394', 'MARILENE MELO DE OLIVEIRA ALVES', 40, 0, 0, 40),
(248, 2, '', '00734550324', 'PAULO DE TARSO ARAUJO DA SILVA', 40, 0, 0, 40),
(249, 2, '', '00291475302', 'ROSANE MENDES CUTRIM', 20, 0, 0, 20),
(250, 2, '', '00348977395', 'ROZANGELA FERREIRA OLIVEIRA', 40, 0, 0, 40),
(251, 2, '', '00283516305', 'WILDIANE SILVA SOUSA ANDRADE', 40, 0, 0, 40),
(252, 2, '322245-TECNICO DE ENFERMAGEM DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(253, 2, '', '96976527320', 'DOMINGAS JACIRA DOS SANTOS MOREIRA', 40, 0, 0, 40),
(254, 2, '', '91813808368', 'ERINALVA FERNANDES DE HOLANDA', 40, 0, 0, 40),
(255, 2, '', '60176092382', 'RAFAELA DA SILVA COSTA', 40, 0, 0, 40),
(256, 2, '515110-ATENDENTE DE ENFERMAGEM', '', '', 0, 0, 0, 0),
(257, 2, '', '99859432368', 'MARIA DE FATIMA SOUSA COSTA', 40, 0, 0, 40),
(356, 4, '223505-ENFERMEIRO', '', '', 0, 0, 0, 0),
(357, 4, '', '61318976383', 'MARCOS ANTONIO DA COSTA RABELO', 40, 0, 0, 40),
(358, 4, '', '61355983339', 'SHIRLEY FONSECA DE SOUSA', 40, 0, 0, 40),
(359, 4, '223565-ENFERMEIRO DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(360, 4, '', '06797327300', 'DAYANA DE JESUS GOMES', 40, 0, 0, 40),
(361, 4, '', '03694284397', 'ILKARYNA MAIA LEITE', 40, 0, 0, 40),
(362, 4, '', '60882185330', 'JOSE PEREIRA DA SILVA NETO', 40, 0, 0, 40),
(363, 4, '322205-TECNICO DE ENFERMAGEM', '', '', 0, 0, 0, 0),
(364, 4, '', '78508380330', 'ANA LOURDES ARAUJO RODRIGUES', 40, 0, 0, 40),
(365, 4, '', '60977907325', 'CAMILA MONTEIRO DOS SANTOS', 40, 0, 0, 40),
(366, 4, '', '00168456338', 'DALVANIRA PIEDADE MARTINS', 40, 0, 0, 40),
(367, 4, '', '06190976395', 'DEBORA DIAS PEDROSA', 40, 0, 0, 40),
(368, 4, '', '61615297340', 'IKARY COSTA PEREIRA', 40, 0, 0, 40),
(369, 4, '', '03962820329', 'JESEANE REIS PIRES SILVA CAMARGO', 40, 0, 0, 40),
(370, 4, '', '81712413368', 'JOSILENE RODRIGUES MELO', 40, 0, 0, 40),
(371, 4, '', '02248096364', 'JUCIEL SILVA CARNEIRO', 40, 0, 0, 40),
(372, 4, '', '00930859316', 'KEILA CERPA FONSECA', 40, 0, 0, 40),
(373, 4, '', '61621502325', 'KLYCIA LAINE SOARES FONSECA', 40, 0, 0, 40),
(374, 4, '', '05929399360', 'LILIETE MOURA FERREIRA', 40, 0, 0, 40),
(375, 4, '', '72478985349', 'LOURDENALVA LEMOS ABREU', 40, 0, 0, 40),
(376, 4, '', '05428433310', 'MARINILDE DE JESUS GOMES', 40, 0, 0, 40),
(377, 4, '', '60661107302', 'NATIELLY BRAGA SILVA', 40, 0, 0, 40),
(378, 4, '', '89053036334', 'RITA JUCELIA SOUZA FERREIRA', 40, 0, 0, 40),
(379, 4, '', '00130511307', 'SUSAN CRISTINE ABREU NEVES', 40, 0, 0, 40),
(380, 4, '', '65502272320', 'TALMIRA CARDOZO ARAUJO ROSA', 40, 0, 0, 40),
(381, 4, '', '60867098317', 'TATIANE SOUSA BRAGA', 40, 0, 0, 40),
(382, 4, '', '61843156334', 'THIAGO MATOS SOUZA', 40, 0, 0, 40),
(383, 4, '', '06190954316', 'VALDELICE BARROS', 40, 0, 0, 40),
(384, 4, '', '60901537373', 'WBERLAN PIRES BIANCO', 40, 0, 0, 40),
(385, 4, '322230-AUXILIAR DE ENFERMAGEM', '', '', 0, 0, 0, 0),
(386, 4, '', '73659770353', 'ADNA GONCALVES VILAR', 40, 0, 0, 40),
(387, 4, '', '99034565300', 'GREICE OLIVEIRA', 40, 0, 0, 40),
(388, 4, '', '73683060344', 'LUCILENE MELO LOUSEIRO', 40, 0, 0, 40),
(389, 4, '322245-TECNICO DE ENFERMAGEM DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(390, 4, '', '69321582304', 'JAKCELINA BORGES SILVA', 40, 0, 0, 40),
(391, 4, '', '72269014391', 'LUCIA MARIA SOARES FURTADO', 40, 0, 0, 40),
(392, 4, '', '61360280340', 'THALIA ADRIELLY SILVA FERREIRA', 40, 0, 0, 40),
(393, 5, '223505-ENFERMEIRO', '', '', 0, 0, 0, 0),
(394, 5, '', '06801582356', 'ANTONIO MAIKON COUTINHO DA SILVA', 40, 0, 0, 40),
(395, 5, '', '95068520306', 'CARLESANDRA SOARES CARTOSO SILVA', 12, 12, 0, 24),
(396, 5, '', '05009469308', 'CLAUDIA RICHELLY MACEDO RODRIGUES', 12, 12, 0, 24),
(397, 5, '', '01695171365', 'ELIELDA SILVA SOUSA', 18, 18, 0, 36),
(398, 5, '', '91661161391', 'IVANIA SOUSA FERREIRA', 0, 24, 0, 24),
(399, 5, '', '04357987318', 'KAROLAYNE BRITO SILVA', 18, 18, 0, 36),
(400, 5, '', '60613472357', 'LUANA LIMA DE SOUSA', 12, 12, 0, 24),
(401, 5, '', '03878747390', 'RAFAELA CARNEIRO BARBOSA GOMES', 0, 40, 0, 40),
(402, 5, '223565-ENFERMEIRO DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(403, 5, '', '60758069383', 'ALICE FIGUEIREDO DE OLIVEIRA', 40, 0, 0, 40),
(404, 5, '', '05686955344', 'AMANDA DOS SANTOS SILVA', 40, 0, 0, 40),
(405, 5, '', '02832473393', 'BLUNA CAROLINE COSTA ARAUJO', 40, 0, 0, 40),
(406, 5, '', '04833722348', 'DAYANA MOURA MORAIS', 40, 0, 0, 40),
(407, 5, '', '61224683390', 'MACELINO BARBOSA NETO', 40, 0, 0, 40),
(408, 5, '', '01903819300', 'MIRIAM LAURA SOUSA ABREU RODRIGUES', 40, 0, 0, 40),
(409, 5, '', '60614584361', 'WALLAS MOURA MACHADO', 40, 0, 0, 40),
(410, 5, '322205-TECNICO DE ENFERMAGEM', '', '', 0, 0, 0, 0),
(411, 5, '', '04935982357', 'ADENILZA SOUSA DA SILVA', 40, 0, 0, 40),
(412, 5, '', '98525212334', 'ALZENIR BESERRA DE MOURA', 0, 40, 0, 40),
(413, 5, '', '69704961391', 'ALZIRENE RODRIGUES DA SILVA', 40, 0, 0, 40),
(414, 5, '', '04348279322', 'ANA MARIA OLIVEIRA DE SOUSA', 40, 0, 0, 40),
(415, 5, '', '95860851391', 'ANA PAULA DA SILVA', 40, 0, 0, 40),
(416, 5, '', '03563010366', 'ANDRELINA CARNEIRO DOS SANTOS', 40, 0, 0, 40),
(417, 5, '', '02418776107', 'ANTONIA AMADOR FRANCA', 0, 40, 0, 40),
(418, 5, '', '49954628304', 'CLAUDETE DE ARAUJO SOUSA', 40, 0, 0, 40),
(419, 5, '', '60171111168', 'CLAUDIA MENDES FARIAS RODRIGUES', 0, 24, 0, 24),
(420, 5, '', '62178760350', 'DANIELE DE SOUSA PEREIRA', 40, 0, 0, 40),
(421, 5, '', '00367170370', 'DIANA MARCIA DE MELO SILVA ALVES', 0, 24, 0, 24),
(422, 5, '', '04000500309', 'ELENILDE COSTA DOS SANTOS', 0, 24, 0, 24),
(423, 5, '', '83468102372', 'FRANCISCA EDINALVA PEREIRA DE MEDINA', 40, 0, 0, 40),
(424, 5, '', '90526910100', 'FRANCISCA NASCIMENTO ALVES', 0, 24, 0, 24),
(425, 5, '', '44622163268', 'JOSE AMILTON ARAUJO PEREIRA', 0, 24, 0, 24),
(426, 5, '', '05518454309', 'KESSIANE ALVES DA SILVA', 40, 0, 0, 40),
(427, 5, '', '03024688382', 'LEIDINETE LEMOS DA SILVA', 0, 44, 0, 44),
(428, 5, '', '83952063304', 'LUZIVANDA BRAVOS DA SILVA', 0, 40, 0, 40),
(429, 5, '', '28031237387', 'MARIA MIRTES DOS SANTOS SILVA', 0, 40, 0, 40),
(430, 5, '', '04226017722', 'MARINALVA BEZERRA', 0, 40, 0, 40),
(431, 5, '', '95165517349', 'REJANE MARIA DA SILVA CRUZ', 0, 40, 0, 40),
(432, 5, '', '01843823357', 'ROSANA SOUSA SILVA', 0, 40, 0, 40),
(433, 5, '', '01251224385', 'SAMARA DOS SANTOS SILVA', 0, 36, 0, 36),
(434, 5, '', '05683460336', 'SAMUEL ALVES ROCHA', 36, 0, 0, 36),
(435, 5, '322245-TECNICO DE ENFERMAGEM DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(436, 5, '', '60484222376', 'FRANCISCA DAS CHAGAS SANTOS FIDELES', 40, 0, 0, 40),
(437, 5, '', '03791511386', 'ODINEIA GODIM DE FRANCA', 40, 0, 0, 40),
(438, 5, '', '47510897300', 'RAIMUNDA MARIA SILVA ARAUJO', 40, 0, 0, 40),
(439, 5, '', '83574891334', 'SANDRA MARIA DE OLIVEIRA MELO', 40, 0, 0, 40),
(440, 5, '322250-AUXILIAR DE ENFERMAGEM DA ESTRATEGIA DE SAUDE DA FAMILIA', '', '', 0, 0, 0, 0),
(441, 5, '', '00432745360', 'MARIA LIANE DOS SANTOS REIS', 40, 0, 0, 40),
(442, 5, '', '01912248395', 'MARIA RITA CARVALHO', 40, 0, 0, 40),
(443, 5, '', '18050875334', 'TERESINHA PEREIRA DA SILVA', 40, 0, 0, 40),
(4817, 7, '223505', '', '', 0, 0, 0, 0),
(4818, 7, '223565', '', '', 0, 0, 0, 0),
(4819, 7, '322205', '', '', 0, 0, 0, 0),
(4820, 7, '322230', '', '', 0, 0, 0, 0),
(4821, 7, '322245', '', '', 0, 0, 0, 0),
(4822, 7, '322250', '', '', 0, 0, 0, 0),
(4823, 7, '223505', '', '', 0, 0, 0, 0),
(4824, 7, '223565', '', '', 0, 0, 0, 0),
(4825, 7, '322205', '', '', 0, 0, 0, 0),
(4826, 7, '322230', '', '', 0, 0, 0, 0),
(4827, 7, '322245', '', '', 0, 0, 0, 0),
(4828, 7, '322250', '', '', 0, 0, 0, 0),
(4829, 7, '223505', '', '', 0, 0, 0, 0),
(4830, 7, '223565', '', '', 0, 0, 0, 0),
(4831, 7, '322205', '', '', 0, 0, 0, 0),
(4832, 7, '322230', '', '', 0, 0, 0, 0),
(4833, 7, '322245', '', '', 0, 0, 0, 0),
(4834, 7, '322250', '', '', 0, 0, 0, 0),
(4835, 7, '223505', '', '', 0, 0, 0, 0),
(4836, 7, '223565', '', '', 0, 0, 0, 0),
(4837, 7, '322205', '', '', 0, 0, 0, 0),
(4838, 7, '322230', '', '', 0, 0, 0, 0),
(4839, 7, '322245', '', '', 0, 0, 0, 0),
(4840, 7, '322250', '', '', 0, 0, 0, 0),
(5635, 1, '223505', '', '', 0, 0, 0, 0),
(5636, 1, '223505', '91809606349', 'ALEXSANDRO VIEIRA ARAUJO', 40, 0, 0, 40),
(5637, 1, '223505', '07655633398', 'ANDERSON LIMA DOS SANTOS', 20, 20, 0, 40),
(5638, 1, '223505', '00544022394', 'ANNY CAROLINY SOUSA MORAES', 0, 15, 0, 15),
(5639, 1, '223505', '04538317373', 'ANTONIO ANDREILSON OLIVEIRA DA SILVA', 20, 10, 0, 30),
(5640, 1, '223505', '94599386391', 'CARLA DAYANA FIGUEIREDO CUNHA', 24, 0, 0, 24),
(5641, 1, '223505', '84997117315', 'CLAUDIO SILVA OLIVEIRA', 15, 15, 0, 30),
(5642, 1, '223505', '04493740337', 'DEISIANE SOUSA PEREIRA', 24, 0, 0, 24),
(5643, 1, '223505', '61391114396', 'DERIK MIKKEL DE SOUSA SILVA', 15, 15, 0, 30),
(5644, 1, '223505', '04555193318', 'DEYVIANNE ALMEIDA DE SOUSA PEREIRA', 10, 20, 0, 30),
(5645, 1, '223505', '04555209338', 'DIONATHAN ALMEIDA DE SOUSA', 30, 0, 0, 30),
(5646, 1, '223505', '61118259335', 'ELIDA TALITA SOUSA MESQUITA', 15, 15, 0, 30),
(5647, 1, '223505', '64383628320', 'EMANUELLE PASSOS MARTINS', 15, 15, 0, 30),
(5648, 1, '223505', '60808189301', 'FRANCIELTON DE SOUSA REGO', 18, 18, 0, 36),
(5649, 1, '223505', '05378928346', 'FRANCIKELE LIMA GONCALVES', 40, 0, 0, 40),
(5650, 1, '223505', '83990666304', 'FRANCISCA SORAIA CAMPELO DA SILVA', 15, 15, 0, 30),
(5651, 1, '223505', '02019399326', 'FRANCISCO ALAN JHON SOUZA PEREIRA', 30, 0, 0, 30),
(5652, 1, '223505', '05835870388', 'FRANCISCO IGOR DOS REIS GONCALVES', 30, 0, 0, 30),
(5653, 1, '223505', '48826561320', 'FRANCISCO WCLERLEM FERREIRA MATIAS', 10, 10, 0, 20),
(5654, 1, '223505', '85479683349', 'GEOVANE VIEGAS MOREIRA', 20, 10, 0, 30),
(5655, 1, '223505', '60832519316', 'GUILHERME SOUSA COSTA', 15, 15, 0, 30),
(5656, 1, '223505', '82312486334', 'HILDA FERNANDES DE SOUSA', 40, 0, 0, 40),
(5657, 1, '223505', '06666714350', 'JULIANA DE SA GOUDINHO', 30, 0, 0, 30),
(5658, 1, '223505', '01058188364', 'JULIANA SOUSA OLIVEIRA CARVALHO', 30, 0, 0, 30),
(5659, 1, '223505', '93428405315', 'KENIA OLIVEIRA SILVA COELHO', 15, 15, 0, 30),
(5660, 1, '223505', '05434104390', 'LAIANNY NASCIMENTO BEZERRA', 0, 30, 0, 30),
(5661, 1, '223505', '04586779306', 'LEIDIANE CASTRO E SILVA', 30, 0, 0, 30),
(5662, 1, '223505', '04025713390', 'LUMARA OLIVEIRA SOUSA', 40, 0, 0, 40),
(5663, 1, '223505', '96705000368', 'MARCELO DE LIMA MACEDO', 24, 0, 0, 24),
(5664, 1, '223505', '60204225345', 'MARIA ANANDA BATISTA DE CASTRO', 15, 15, 0, 30),
(5665, 1, '223505', '05571990341', 'NATALINO SOUSA CARVALHO', 15, 15, 0, 30),
(5666, 1, '223505', '01135018383', 'PATRICIA MAGNA LIMA SOUSA', 24, 0, 0, 24),
(5667, 1, '223505', '04695507323', 'POLIANNA TELES PONTES SILVA', 30, 0, 0, 30),
(5668, 1, '223505', '93346689387', 'PRISCYLA NAYARA ARAUJO DAMASCENO', 30, 0, 0, 30),
(5669, 1, '223505', '90564456349', 'RAIMUNDO GOMES DE OLIVEIRA JUNIOR', 15, 15, 0, 30),
(5670, 1, '223505', '02610432186', 'RAQUEL GLORIA DOS SANTOS', 40, 0, 0, 40),
(5671, 1, '223505', '04828069313', 'RAYANNA CRISTINA DE MORAIS E SILVA', 30, 0, 0, 30),
(5672, 1, '223505', '08022311367', 'REBECA LETICIA DE MELO REINALDO', 30, 0, 0, 30),
(5673, 1, '223505', '02718336374', 'RIVANIA DA SILVA MELO', 15, 15, 0, 30),
(5674, 1, '223505', '75550547368', 'RUDNEY FERNANDES DE SOUSA VIEIRA', 24, 0, 0, 24),
(5675, 1, '223505', '60489273394', 'STANLEY SOUSA DAMASCENO', 15, 15, 0, 30),
(5676, 1, '223505', '01547773316', 'STENIO DE SOUZA MATOS', 30, 0, 0, 30),
(5677, 1, '223505', '64668789372', 'TACIANY SILVA COSTA DO NASCIMENTO', 30, 0, 0, 30),
(5678, 1, '223505', '02045411311', 'TAMIRES FERREIRA SILVA GALDINO DE LIMA', 20, 0, 0, 20),
(5679, 1, '223505', '06468882427', 'THAISY GONCALVES SAMPAIO PAIVA', 40, 0, 0, 40),
(5680, 1, '223505', '02709584360', 'VERONICA DANIELLE LIMA DE MIRANDA', 30, 0, 0, 30),
(5681, 1, '223505', '61856265358', 'WATHILLA DOS SANTOS SANTANA', 15, 15, 0, 30),
(5682, 1, '223505', '00711898316', 'WATTYNA MARA COELHO LEANDRO', 24, 0, 0, 24),
(5683, 1, '223565', '', '', 0, 0, 0, 0),
(5684, 1, '223565', '61046848313', 'ADEILZA SOUSA COELHO', 40, 0, 0, 40),
(5685, 1, '223565', '04785443324', 'ALBEANE BATISTA DA SILVA', 40, 0, 0, 40),
(5686, 1, '223565', '05430289337', 'ANANDA MORAIS SILVA', 40, 0, 0, 40),
(5687, 1, '223565', '29065525858', 'CHARLES FEITOSA DE SOUSA', 40, 0, 0, 40),
(5688, 1, '223565', '06328201362', 'DEBORA KESIA SOUSA DA SILVA', 40, 0, 0, 40),
(5689, 1, '223565', '02991541300', 'DEYNA SOUSA SANTOS', 40, 0, 0, 40),
(5690, 1, '223565', '00279497377', 'FERNANDA NAJARA FERNANDES DE SOUSA VIEIRA', 40, 0, 0, 40),
(5691, 1, '223565', '05281330390', 'FERNANDA NASCIMENTO DE OLIVEIRA', 40, 0, 0, 40),
(5692, 1, '223565', '91803535334', 'HERBERT QUEIROZ SILVA', 40, 0, 0, 40),
(5693, 1, '223565', '60997196360', 'IRENE CARDOSO DE OLIVEIRA LIMA NETA', 20, 0, 0, 20),
(5694, 1, '223565', '00346030269', 'JESSICA TEIXEIRA DA SILVA', 40, 0, 0, 40),
(5695, 1, '223565', '03723652301', 'JOICE SILVA NASCIMENTO', 40, 0, 0, 40),
(5696, 1, '223565', '28839169857', 'JOSE GELSIVAN AQUINO BEZERRA', 40, 0, 0, 40),
(5697, 1, '223565', '06435348308', 'RAISSA PEREIRA DA SILVA', 40, 0, 0, 40),
(5698, 1, '223565', '00467483345', 'RENATA ANTUNES DOS SANTOS GALDINO', 40, 0, 0, 40),
(5699, 1, '223565', '64632709387', 'RICARDO AUGUSTO LIMA DA SILVA', 40, 0, 0, 40),
(5700, 1, '223565', '61168561361', 'SAMILLA DOS SANTOS BARROS SILVA', 40, 0, 0, 40),
(5701, 1, '322205', '', '', 0, 0, 0, 0),
(5702, 1, '322205', '01737682370', 'ADRIANA MOURA DE ANDRADE', 20, 20, 0, 40),
(5703, 1, '322205', '03977481320', 'ADRIANA OLIVEIRA DA SILVA', 40, 0, 0, 40),
(5704, 1, '322205', '06173916371', 'AIANY DINARIA SIMAO XAVIER', 30, 0, 0, 30),
(5705, 1, '322205', '05881187377', 'ALANE COSTA ALMEIDA', 40, 0, 0, 40),
(5706, 1, '322205', '75907682353', 'ALCIANE LIMA SILVA', 40, 0, 0, 40),
(5707, 1, '322205', '01192878388', 'ALINE SA LUCENA ALCANTARA', 15, 15, 0, 30),
(5708, 1, '322205', '61124368337', 'AMANDA GALVAO SANTOS', 40, 0, 0, 40),
(5709, 1, '322205', '02985389380', 'ANA CARLA BARBOSA DE MATOS', 20, 20, 0, 40),
(5710, 1, '322205', '94666296387', 'ANAELZA LEITE FRANCA', 36, 0, 0, 36),
(5711, 1, '322205', '73505501387', 'ANDREILSON LIMA DO NASCIMENTO', 0, 30, 0, 30),
(5712, 1, '322205', '02128854300', 'ANTONIA ERISNEIDE COSTA LIMA', 20, 0, 0, 20),
(5713, 1, '322205', '36436739300', 'ANTONIA HENRIQUE DE OLIVEIRA', 40, 0, 0, 40),
(5714, 1, '322205', '01398994308', 'ANTONIA KELIANE OLIVEIRA', 0, 30, 0, 30),
(5715, 1, '322205', '03539079360', 'ANTONIA SOLETE PORTELA SOUZA', 40, 0, 0, 40),
(5716, 1, '322205', '02047062381', 'ANTONIO CARLOS ALVES NASCIMENTO', 0, 30, 0, 30),
(5717, 1, '322205', '05434702379', 'AYANE CAROLINE RAMALHO DELMIRO', 20, 20, 0, 40),
(5718, 1, '322205', '05690159360', 'BEATRIZ SAMARA FERRO ALVES', 40, 0, 0, 40),
(5719, 1, '322205', '08034789763', 'BENALICE TEIXEIRA LOPES', 10, 0, 0, 10),
(5720, 1, '322205', '65148134372', 'BENTA DE SOUSA FEITOSA', 40, 0, 0, 40),
(5721, 1, '322205', '61412032300', 'BRUNA TAYNA NASCIMENTO CARVALHO', 40, 0, 0, 40),
(5722, 1, '322205', '62039745360', 'CAMILA DA SILVA LIMA', 40, 0, 0, 40),
(5723, 1, '322205', '40323455387', 'CARMEM LUCIA PONTES SANTOS', 36, 0, 0, 36),
(5724, 1, '322205', '61251106307', 'CAROLINA SILVA BRITO', 40, 0, 0, 40),
(5725, 1, '322205', '88810640306', 'CICERA ONEIDE DOS ANJOS SILVA', 40, 0, 0, 40),
(5726, 1, '322205', '02697442316', 'DARLENE BEZERRA FRANCO', 18, 18, 0, 36),
(5727, 1, '322205', '05111179305', 'DETYANA ALVES DE SOUSA', 36, 0, 0, 36),
(5728, 1, '322205', '60268717303', 'DEVANIA COSTA SOUSA', 40, 0, 0, 40),
(5729, 1, '322205', '02775592350', 'EDILMA PEREIRA RODRIGUES', 20, 20, 0, 40),
(5730, 1, '322205', '83848134349', 'EDINALVA PEREIRA RODRIGUES', 40, 0, 0, 40),
(5731, 1, '322205', '65827082368', 'ELINETE DIAS PACHECO', 0, 30, 0, 30),
(5732, 1, '322205', '60131908367', 'ELISANGELA ARAUJO DA SILVA', 20, 20, 0, 40),
(5733, 1, '322205', '02432159322', 'EMANUELA SILVA GOMES', 20, 20, 0, 40),
(5734, 1, '322205', '05981461306', 'ERICA SANTOS SILVA', 40, 0, 0, 40),
(5735, 1, '322205', '60245221344', 'ERINEIDE GONCALVES MARROCOS ALVES', 20, 20, 0, 40),
(5736, 1, '322205', '23547260310', 'ESMERALDA SANTOS CARVALHO', 15, 15, 0, 30),
(5737, 1, '322205', '32229127349', 'EVA GOMES DA SILVA SOUSA', 40, 0, 0, 40),
(5738, 1, '322205', '61613676379', 'EVA KANANDA SILVA CARVALHO', 40, 0, 0, 40),
(5739, 1, '322205', '67036783320', 'FILIPE SILVA SOUSA', 20, 20, 0, 40),
(5740, 1, '322205', '02637674342', 'FRANCIDALVA LOURA DA SILVA', 20, 20, 0, 40),
(5741, 1, '322205', '62327878381', 'FRANCIELE LIMA DA SILVA', 40, 0, 0, 40),
(5742, 1, '322205', '00366387308', 'FRANCINALVA LIMA DOS ANJOS DE ARAUJO', 15, 15, 0, 30),
(5743, 1, '322205', '81796935387', 'FRANCINETE DOS SANTOS DE BRITO', 40, 0, 0, 40),
(5744, 1, '322205', '03535297370', 'FRANCISA SIMONE PEREIRA GOMES OLIVEIRA', 36, 0, 0, 36),
(5745, 1, '322205', '02993549383', 'FRANCISCA JOSILEIDE PEREIRA DE SOUSA', 20, 20, 0, 40),
(5746, 1, '322205', '84563850349', 'FRANCISCA LEILA PACHECO DE SOUSA', 40, 0, 0, 40),
(5747, 1, '322205', '03921597323', 'FRANCISCA MARIA GONCALVES LIMA', 40, 0, 0, 40),
(5748, 1, '322205', '05155353386', 'FRANCISCLEIA DOS SANTOS SOUSA', 30, 0, 0, 30),
(5749, 1, '322205', '06632167373', 'FRANCISCO RUAN DOS SANTOS SILVA', 40, 0, 0, 40),
(5750, 1, '322205', '03563205370', 'FRANCUI MARIANO BEZERRA', 20, 20, 0, 40),
(5751, 1, '322205', '03641932394', 'GIDEAO SILVA BARROS', 0, 30, 0, 30),
(5752, 1, '322205', '03009355360', 'GIRLEANE SANTANA DOS SANTOS', 40, 0, 0, 40),
(5753, 1, '322205', '05076352301', 'IAGO SOUSA LIMA', 30, 0, 0, 30),
(5754, 1, '322205', '62432368380', 'ILANNE PEREIRA DE SOUSA', 40, 0, 0, 40),
(5755, 1, '322205', '03776726377', 'ILAYANNA TATHYLA VERAS DE CARVALHO', 40, 0, 0, 40),
(5756, 1, '322205', '61607862379', 'ISABEL CRISTINA SILVEIRA DA SILVA', 40, 0, 0, 40),
(5757, 1, '322205', '03772914390', 'IVANILDA MOURA', 40, 0, 0, 40),
(5758, 1, '322205', '01961449307', 'JACIRENE DA SILVA TORRES', 20, 20, 0, 40),
(5759, 1, '322205', '00406549311', 'JANE SILVA SUASSUNA XAVIER', 20, 20, 0, 40),
(5760, 1, '322205', '04712124318', 'JARDENIA GRAZIELLE ROCHA DA SILVA', 40, 0, 0, 40),
(5761, 1, '322205', '02209240310', 'JEISE SUASSUNA TORRES', 40, 0, 0, 40),
(5762, 1, '322205', '04491077363', 'JESSE BEZERRA SILVA', 40, 0, 0, 40),
(5763, 1, '322205', '61881698360', 'JESSIANE SOBRINO LIMA', 40, 0, 0, 40),
(5764, 1, '322205', '75007894320', 'JOEL CARVALHO RESPLANDES', 40, 0, 0, 40),
(5765, 1, '322205', '99243121391', 'JOSIANE CARVALHO BILIO', 0, 30, 0, 30),
(5766, 1, '322205', '02783330369', 'JURACI BRASIL DO REGO', 20, 20, 0, 40),
(5767, 1, '322205', '60970468393', 'KACIO LIMA GONCALVES', 20, 20, 0, 40),
(5768, 1, '322205', '62049377312', 'KARLA LANNA DA SILVA FERREIRA', 40, 0, 0, 40),
(5769, 1, '322205', '60997018348', 'LEILA MAIANE DA SILVA ASSUNCAO', 40, 0, 0, 40),
(5770, 1, '322205', '01950117324', 'LINDINALVA DE SOUSA SANTOS', 36, 0, 0, 36),
(5771, 1, '322205', '05979260340', 'LIZANIA SOUSA DO NASCIMENTO', 40, 0, 0, 40),
(5772, 1, '322205', '13462442864', 'LUZANIRA ALVES FURTADO', 40, 0, 0, 40),
(5773, 1, '322205', '98812742300', 'MAIRON MORAES ARAUJO', 30, 0, 0, 30),
(5774, 1, '322205', '02813537357', 'MARIA ALESSANDRA DOS SANTOS TORRES', 40, 0, 0, 40),
(5775, 1, '322205', '03499535386', 'MARIA ANTONIA GONZAGA DE SOUSA', 40, 0, 0, 40),
(5776, 1, '322205', '00037813137', 'MARIA BETANIA DE SOUSA', 20, 20, 0, 40),
(5777, 1, '322205', '71214453368', 'MARIA DE JESUS DA SILVA RIBEIRO', 20, 20, 0, 40),
(5778, 1, '322205', '60011569301', 'MARIA DE JESUS MATOS NASCIMENTO', 30, 0, 0, 30),
(5779, 1, '322205', '80202101304', 'MARIA DO SOCORRO PEREIRA SOUSA', 20, 20, 0, 40),
(5780, 1, '322205', '02317385366', 'MARIA FRANCIANE SILVA ANDRADE', 15, 15, 0, 30),
(5781, 1, '322205', '02135677337', 'MARIA FRANCISCA VIEIRA LIMA', 40, 0, 0, 40),
(5782, 1, '322205', '02173536303', 'MARIA IRANILDE PACHECO OLIVEIRA', 10, 10, 0, 20),
(5783, 1, '322205', '64301907300', 'MARIA JOSE DA COSTA ASSUNCAO', 0, 30, 0, 30),
(5784, 1, '322205', '60347640338', 'MARIA JUVENILDA MACEDO SILVA', 20, 20, 0, 40),
(5785, 1, '322205', '02718330333', 'MARIA RAILLANE ARAUJO RODRIGUES', 0, 30, 0, 30),
(5786, 1, '322205', '00089777395', 'MARIA RISONETE CARVALHO RESPLANDES', 0, 30, 0, 30),
(5787, 1, '322205', '36841178890', 'MARIA RITA DA CONCEICAO SILVA', 20, 20, 0, 40),
(5788, 1, '322205', '01011388308', 'MARIA RODRIGUES DE OLIVEIRA', 0, 30, 0, 30),
(5789, 1, '322205', '06296702345', 'MARIA SANTA DOS REIS SANTOS', 40, 0, 0, 40),
(5790, 1, '322205', '82922748391', 'MARQUIZA BATISTA DA SILVA MACHADO', 40, 0, 0, 40),
(5791, 1, '322205', '07037393363', 'MERISSA CARINE SANTOS DE OLIVEIRA', 20, 20, 0, 40),
(5792, 1, '322205', '04897344301', 'MIKAELLE DOS SANTOS LIMA', 30, 0, 0, 30),
(5793, 1, '322205', '08237348389', 'MIKAELLE MARROCOS FREITAS', 40, 0, 0, 40),
(5794, 1, '322205', '02591949301', 'NATHALIA DOS SANTOS SOUSA BELARMINO', 40, 0, 0, 40),
(5795, 1, '322205', '00432107320', 'NATHALIA DUARTE FREITAS', 40, 0, 0, 40),
(5796, 1, '322205', '62322461369', 'NAYLA NATHELLE HOLANDA SILVA', 36, 0, 0, 36),
(5797, 1, '322205', '03408129312', 'NETIANE VIEIRA TEIXEIRA SANTOS', 20, 20, 0, 40),
(5798, 1, '322205', '04605917381', 'ONAYRA TATILA PESSOA SILVA', 30, 0, 0, 30),
(5799, 1, '322205', '00748156364', 'PATRICIA SILVA FEITOSA', 40, 0, 0, 40),
(5800, 1, '322205', '05718549311', 'PAULIANA OLIVEIRA NASCIMENTO', 40, 0, 0, 40),
(5801, 1, '322205', '01005975302', 'PAULO DOUGLAS PEREIRA BRITO', 30, 0, 0, 30),
(5802, 1, '322205', '61183974302', 'PAULO RENATO SOUSA SILVA', 40, 0, 0, 40),
(5803, 1, '322205', '05255170305', 'POLIANA DA SILVA', 0, 30, 0, 30),
(5804, 1, '322205', '04852300380', 'RAFAEL DE SOUSA ARAUJO SILVA', 0, 30, 0, 30),
(5805, 1, '322205', '02157770348', 'RAFAELLE SOUSA DE ALMEIDA', 20, 20, 0, 40),
(5806, 1, '322205', '62501787323', 'RAILEANE SILVA SOUSA', 40, 0, 0, 40),
(5807, 1, '322205', '61080255303', 'RAILLAN DIAS DE SOUSA', 20, 20, 0, 40),
(5808, 1, '322205', '33415013391', 'RAIMUNDA NATIVIDADE CASTRO MACEDO', 40, 0, 0, 40),
(5809, 1, '322205', '93473192368', 'RALINE MARIA OLIVEIRA', 40, 0, 0, 40),
(5810, 1, '322205', '04264168309', 'RAQUEL SOUSA ROCHA', 40, 0, 0, 40),
(5811, 1, '322205', '40466159315', 'REGIANE BATISTA DE ARAUJO', 20, 20, 0, 40),
(5812, 1, '322205', '04750070343', 'RITA DE CASSIA LIMA DA SILVA', 40, 0, 0, 40),
(5813, 1, '322205', '80461077353', 'ROSA AMELIA LIMA BRANDAO', 0, 30, 0, 30),
(5814, 1, '322205', '04325865390', 'ROSILDA SOUSA MARTINS', 20, 20, 0, 40),
(5815, 1, '322205', '98803387234', 'SAMARA ANCHIETA DA SILVA', 20, 20, 0, 40),
(5816, 1, '322205', '61612487351', 'SAMARA DA SILVA CONCEICAO', 20, 20, 0, 40),
(5817, 1, '322205', '44937415387', 'SANDRA ALVES PEREIRA', 20, 20, 0, 40),
(5818, 1, '322205', '00804853320', 'SAULO DIOGO PEREIRA BRITO', 30, 0, 0, 30),
(5819, 1, '322205', '40188868372', 'SEBASTIAO DOS SANTOS SILVA', 40, 0, 0, 40),
(5820, 1, '322205', '88727912353', 'SILVANI FEITOSA DA SILVA SANTOS', 0, 30, 0, 30),
(5821, 1, '322205', '02322427390', 'SIMONE FERREIRA DE SOUSA', 40, 0, 0, 40),
(5822, 1, '322205', '34415718353', 'SONIA MARIA GOMES BARBOSA', 20, 20, 0, 40),
(5823, 1, '322205', '00018441300', 'TAMIRES BARBOSA DA SILVA OLIVEIRA', 18, 18, 0, 36),
(5824, 1, '322205', '42383971855', 'TATIANE SANTOS OLIVEIRA', 40, 0, 0, 40),
(5825, 1, '322205', '02952388369', 'VALBETANIA DA CONCEICAO DOS SANTOS', 40, 0, 0, 40),
(5826, 1, '322205', '01065970358', 'VALDENICE DE SOUSA PASSOS', 20, 20, 0, 40),
(5827, 1, '322205', '34597000330', 'VANDA LUCIA CARDOSO DOS SANTOS E SILVA', 20, 20, 0, 40),
(5828, 1, '322230', '', '', 0, 0, 0, 0),
(5829, 1, '322230', '34595635320', 'MARIA IRACI COELHO SAMPAIO', 30, 0, 0, 30),
(5830, 1, '322230', '02668256305', 'MARIA VIRGINIA BARROS DOS SANTOS', 30, 0, 0, 30),
(5831, 1, '322245', '', '', 0, 0, 0, 0),
(5832, 1, '322245', '09009757331', 'ANDREIA DOS SANTOS REIS', 40, 0, 0, 40),
(5833, 1, '322245', '07178478373', 'DIEGO DOS SANTOS RUBIM FERREIRA', 40, 0, 0, 40),
(5834, 1, '322245', '05832961307', 'DIENES DE OLIVEIRA SANTOS', 40, 0, 0, 40),
(5835, 1, '322245', '81045786349', 'EDILEUSA ANDRADE VIANA', 40, 0, 0, 40),
(5836, 1, '322245', '01695400305', 'EGLA CLARA PEREIRA DE SOUSA', 40, 0, 0, 40),
(5837, 1, '322245', '02215153300', 'FRANCISCA EDEILDA MATIAS SILVA', 40, 0, 0, 40),
(5838, 1, '322245', '61592823360', 'FRANCISCO DE ASSIS DA SILVA OLIVEIRA', 40, 0, 0, 40),
(5839, 1, '322245', '60999005359', 'FRANCISCO DE MORAES REGO NETO', 40, 0, 0, 40),
(5840, 1, '322245', '03575164355', 'JACQUELANE PEDROSA DA SILVA', 40, 0, 0, 40),
(5841, 1, '322245', '61125037350', 'JOSENILDA DE SOUSA SILVA', 40, 0, 0, 40),
(5842, 1, '322245', '61307380301', 'LUANA DOS PASSOS SANTOS', 40, 0, 0, 40),
(5843, 1, '322245', '80180698249', 'MANOEL SOUSA OLIVEIRA', 40, 0, 0, 40),
(5844, 1, '322245', '26570097865', 'MARIA EURISMAR ROCHA DA SILVA', 40, 0, 0, 40),
(5845, 1, '322245', '06686973343', 'PATRICIA ALVES SILVA', 40, 0, 0, 40),
(5846, 1, '322245', '61611264359', 'RAILON BEZERRA DE SOUSA', 40, 0, 0, 40),
(5847, 1, '322245', '61185773312', 'ROSANGELA SILVA ROCHA', 40, 0, 0, 40),
(5848, 1, '322245', '04190648345', 'SOCORRO BILIO MATIAS', 40, 0, 0, 40),
(5849, 1, '515110', '', '', 0, 0, 0, 0),
(5850, 1, '515110', '61606652354', 'DENILSON RIBEIRO DE SOUZA', 40, 0, 0, 40),
(5851, 1, '515110', '04500538305', 'FRANCISCO EDNALDO SILVA DE OLIVEIRA', 40, 0, 0, 40),
(5852, 1, '515110', '05079174307', 'JAMES DIAS LUZ', 40, 0, 0, 40);

-- --------------------------------------------------------

--
-- Estrutura da tabela `tb_piso_enf`
--

CREATE TABLE `tb_piso_enf` (
  `id` int(11) NOT NULL,
  `cpf` varchar(20) NOT NULL,
  `cnes_empreg` varchar(10) NOT NULL,
  `cbo` varchar(10) NOT NULL,
  `ativo_comp` varchar(2) NOT NULL,
  `h_total` int(11) NOT NULL,
  `salario_mensal` varchar(220) NOT NULL,
  `isalubridade` varchar(220) NOT NULL,
  `add_noturno` varchar(220) NOT NULL,
  `outros` varchar(220) NOT NULL,
  `encargos` varchar(220) NOT NULL,
  `remune_total` varchar(220) NOT NULL,
  `comple_uniao` varchar(220) NOT NULL,
  `obs` varchar(220) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Extraindo dados da tabela `tb_piso_enf`
--

INSERT INTO `tb_piso_enf` (`id`, `cpf`, `cnes_empreg`, `cbo`, `ativo_comp`, `h_total`, `salario_mensal`, `isalubridade`, `add_noturno`, `outros`, `encargos`, `remune_total`, `comple_uniao`, `obs`) VALUES
(1, '07655633398', '2461277', '223505', 'S', 40, '3.007,77', '0,00', '', '0,00', '0,00', '3.007,77', '1.310,41', ''),
(2, '36436739300', '2455412', '322245', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(3, '60268717303', '2390388', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(4, '06632167373', '2455412', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(5, '61607862379', '6324665', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(6, '62049377312', '2390361', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(7, '03445861382', '2461277', '322205', 'S', 40, '1.500,26', '0,00', '', '0,00', '0,00', '1.500,26', '', 'Profissional não cadastrado no COFEN'),
(8, '06296702345', '5792932', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(9, '04264168309', '2390361', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(10, '13462442864', '2455412', '322205', 'S', 40, '1.500,26', '0,00', '', '0,00', '0,00', '1.500,26', '1.522,47', ''),
(11, '00089777395', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(12, '04555193318', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(13, '93473192368', '6629229', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(14, '36841178890', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(15, '60999005359', '6629229', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(16, '04897344301', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(17, '01135018383', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(18, '03009355360', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(19, '02157770348', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(20, '84563850349', '7068123', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(21, '42383971855', '6936105', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(22, '62039745360', '2455420', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(23, '00037813137', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(24, '02432159322', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(25, '05155353386', '7068123', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(26, '61251106307', '6936105', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(27, '04493740337', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(28, '60489273394', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(29, '82312486334', '2455412', '223505', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(30, '60808189301', '2461277', '223505', 'S', 36, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '640,34', ''),
(31, '03977481320', '2455420', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(32, '91803535334', '6629180', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(33, '62322461369', '2461277', '322205', 'S', 36, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(34, '60614253330', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(35, '64383628320', '2461277', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(36, '29065525858', '2390388', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(37, '03772914390', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(38, '04785443324', '5792916', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(39, '06665495329', '2461277', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(40, '88727912353', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(41, '61046848313', '5792932', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(42, '05832961307', '2390361', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(43, '04538317373', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(44, '02610432186', '6629199', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(45, '04750070343', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(46, '02047062381', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(47, '05255170305', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(48, '81045786349', '6629253', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(49, '05378928346', '6629229', '223505', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(50, '05881187377', '2390388', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(51, '23547260310', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(52, '94666296387', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(53, '00734550324', '7068123', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(54, '04828069313', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(55, '48826561320', '2461277', '223505', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(56, '02322427390', '6629229', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(57, '01547773316', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(58, '00279497377', '6629202', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(59, '02813537357', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(60, '00711898316', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(61, '93428405315', '2461277', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(62, '03641932394', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(63, '04852300380', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(64, '60204225345', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(65, '61881698360', '2461277', '322205', 'S', 40, '1.500,23', '300,05', '', '180,03', '0,00', '1.980,31', '1.419,59', ''),
(66, '04491077363', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(67, '03776726377', '6629180', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(68, '02991541300', '6629237', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(69, '03563205370', '2461277', '322205', 'S', 40, '1.500,00', '300,00', '', '180,00', '0,00', '1.980,00', '1.419,84', ''),
(70, '09009757331', '6629180', '322245', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(71, '01005975302', '7068123', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(72, '40466159315', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(73, '80202101304', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '', 'Profissional não cadastrado no COFEN'),
(74, '06328201362', '2455412', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(75, '64668789372', '6629180', '223505', 'S', 30, '3.500,77', '700,15', '', '420,09', '0,00', '4.621,01', '', 'Remuneração já compatível com o piso estabelecido.'),
(76, '61080255303', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(77, '06686973343', '6629199', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(78, '01398994308', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(79, '93346689387', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(80, '02209240310', '2461277', '322205', 'S', 20, '1.656,97', '331,39', '', '422,00', '159,42', '2.410,36', '', 'Remuneração já compatível com o piso estabelecido.'),
(81, '03921597323', '6629229', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(82, '82922748391', '6629199', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(83, '01058188364', '6629229', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(84, '04190648345', '6629245', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(85, '00406549311', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(86, '71214453368', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(87, '73505501387', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '', 'Profissional não cadastrado no COFEN'),
(88, '05430289337', '6629229', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(89, '07178478373', '2390388', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(90, '04586779306', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(91, '75907682353', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(92, '05571990341', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(93, '08237348389', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(94, '75550547368', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Profissional não cadastrado no COFEN'),
(95, '90564456349', '2461277', '223505', 'S', 30, '3.313,96', '662,79', '', '331,40', '614,37', '4.308,15', '', 'Remuneração já compatível com o piso estabelecido.'),
(96, '00804853320', '7068123', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(97, '02128854300', '2461277', '322205', 'S', 20, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '', 'Remuneração já compatível com o piso estabelecido.'),
(98, '61613676379', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(99, '05281330390', '6629199', '223505', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(100, '98812742300', '7068123', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(101, '00467483345', '6142648', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(102, '60011569301', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(103, '02045411311', '6629229', '223505', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(104, '60347640338', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(105, '98803387234', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(106, '61183974302', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(107, '02591949301', '2461277', '322205', 'S', 40, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '1.252,10', ''),
(108, '67036783320', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '', 'Carga horária incompatível'),
(109, '06666714350', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(110, '40188868372', '2455439', '322205', 'S', 40, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '1.252,10', ''),
(111, '80180698249', '2455420', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(112, '34597000330', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(113, '83848134349', '6629180', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(114, '61592823360', '5792932', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(115, '99243121391', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(116, '01961449307', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(117, '61307380301', '6629202', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(118, '02991540338', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(119, '61391114396', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(120, '08022311367', '6629180', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(121, '61185773312', '6245307', '322245', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(122, '02718330333', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(123, '03499535386', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(124, '60245221344', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(125, '00366387308', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(126, '04712124318', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(127, '44937415387', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(128, '84997117315', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(129, '62501787323', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(130, '04695507323', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(131, '05979260340', '6629229', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(132, '05281330390', '6245307', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(133, '61612487351', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(134, '03575164355', '5792916', '322245', 'S', 40, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '1.252,10', ''),
(135, '01192878388', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '450,00', '171,94', '2.438,36', '352,86', ''),
(136, '02783330369', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(137, '07037393363', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(138, '60832519316', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(139, '64301907300', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '1.503,89', '288,94', '3.492,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(140, '01065970358', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(141, '05835870388', '6936105', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(142, '00346030269', '6629245', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(143, '60131908367', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(144, '02317385366', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(145, '61856265358', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(146, '03535297370', '2461277', '322205', 'S', 36, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.117,29', ''),
(147, '02173536303', '2461277', '322205', 'S', 20, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '', 'Remuneração já compatível com o piso estabelecido.'),
(148, '61118259335', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(149, '33415013391', '6629199', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(150, '04325865390', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(151, '01695400305', '2455439', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(152, '60970468393', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(153, '40323455387', '2461277', '322205', 'S', 36, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(154, '05430289337', '6629199', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(155, '85479683349', '2461277', '223505', 'S', 20, '3.313,96', '662,79', '', '331,40', '614,37', '4.308,15', '', 'Remuneração já compatível com o piso estabelecido.'),
(156, '62327878381', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(157, '02985389380', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(158, '05434702379', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(159, '01011388308', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(160, '65148134372', '6629229', '322205', 'S', 40, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '1.252,10', ''),
(161, '00018441300', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(162, '02775592350', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(163, '05434104390', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(164, '94599386391', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(165, '03723652301', '6629253', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(166, '02135677337', '6629199', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(167, '32229127349', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(168, '01737682370', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(169, '75007894320', '6629180', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(170, '65827082368', '2461277', '322205', 'S', 30, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '496,42', ''),
(171, '05111179305', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(172, '00748156364', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(173, '02019399326', '0511250', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(174, '02697442316', '2461277', '322205', 'S', 36, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '949,83', ''),
(175, '02637674342', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(176, '01246840332', '2461277', '322205', 'S', 36, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(177, '60997196360', '5792932', '223565', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(178, '00432107320', '6629229', '322205', 'S', 40, '1.355,73', '0,00', '', '0,00', '102,48', '1.355,73', '1.667,00', ''),
(179, '61412032300', '6936105', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(180, '61611264359', '6629237', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(181, '06173916371', '2461277', '322205', 'S', 30, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '663,88', ''),
(182, '28839169857', '2390361', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(183, '01950117324', '2461277', '322205', 'S', 36, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.117,29', ''),
(184, '04555209338', '6629229', '223505', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(185, '02718336374', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(186, '08034789763', '2461277', '322205', 'S', 10, '1.656,97', '331,39', '', '198,84', '159,42', '2.187,20', '', 'Remuneração já compatível com o piso estabelecido.'),
(187, '03539079360', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(188, '61168561361', '2455439', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(189, '02993549383', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(190, '02215153300', '2455412', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(191, '05076352301', '6629229', '322205', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(192, '05718549311', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(193, '64632709387', '2455420', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(194, '83990666304', '2461277', '223505', 'S', 30, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(195, '26570097865', '6629245', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(196, '61125037350', '6142648', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(197, '02209240310', '0511250', '322205', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(198, '81796935387', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(199, '02952388369', '6629180', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(200, '00544022394', '2461277', '223505', 'S', 15, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(201, '34415718353', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(202, '62432368380', '2461277', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(203, '61124368337', '2455439', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(204, '96705000368', '7068123', '223505', 'S', 24, '3.007,77', '601,55', '', '360,93', '0,00', '3.970,25', '', 'Remuneração já compatível com o piso estabelecido.'),
(205, '88810640306', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(206, '03408129312', '2461277', '322205', 'S', 40, '1.500,26', '300,05', '', '180,03', '0,00', '1.980,34', '1.419,56', ''),
(207, '05378928346', '2455420', '223505', 'S', 20, '3.007,77', '0,00', '', '0,00', '311,61', '3.007,77', '', 'Remuneração já compatível com o piso estabelecido.'),
(208, '96976527320', '6858856', '322245', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(209, '29252989315', '2461633', '223505', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(210, '00283516305', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(211, '61602985340', '6858856', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(212, '05141479382', '2821257', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(213, '02824804394', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(214, '24268011315', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(215, '93110286300', '2821257', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(216, '64595560249', '2530104', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(217, '02277261386', '6765718', '223505', 'S', 20, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(218, '00734550324', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(219, '04961904317', '2821257', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(220, '06442744337', '2821257', '223565', 'S', 30, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(221, '00338084304', '2821257', '223565', 'S', 30, '2.000,00', '', '', '', '', '2.000,00', '1.238,64', ''),
(222, '60176092382', '2530104', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(223, '01812593384', '2461633', '223505', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(224, '60194346307', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(225, '03596991382', '2461633', '223505', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(226, '00692210300', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(227, '03228261360', '2821257', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(228, '00348977395', '2821257', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(229, '00224527371', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(230, '95954198187', '2461633', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(231, '91813808368', '6858856', '322245', 'S', 40, '2.831,40', '', '', '', '', '2.831,40', '191,33', ''),
(232, '03605240364', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '', 'Carga horária incompatível'),
(233, '04072695335', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(234, '60021061386', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(235, '26730033800', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(236, '01875886354', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(237, '00291475302', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(238, '65412087353', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(239, '03701334390', '2461633', '223565', 'S', 40, '2.000,00', '', '', '', '', '2.000,00', '2.318,18', ''),
(240, '89135075368', '2461633', '223565', 'S', 40, '3.528,71', '', '', '', '', '3.528,71', '789,47', ''),
(241, '08885082394', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(242, '84494077372', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(243, '08365761360', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(244, '62118430388', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(245, '61634947339', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(246, '60801574382', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(247, '06769009331', '2461633', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(248, '99859432368', '2461633', '322205', 'S', 40, '2.779,92', '', '', '', '', '2.779,92', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(249, '00045245355', '6310257', '223565', 'S', 40, '2.800,00', '', '', '1.350,00', '597,96', '4.150,00', '', 'Carga horária incompatível'),
(250, '00323576303', '2460335', '322205', 'S', 52, '1.320,00', '264,00', '264,00', '', '146,52', '1.848,00', '', 'Carga horária incompatível'),
(251, '04998772333', '5068770', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(252, '61821596340', '6310257', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(253, '81457812215', '2460335', '322205', 'S', 52, '1.320,00', '264,00', '264,00', '132,00', '158,40', '1.980,00', '', 'Carga horária incompatível'),
(254, '02194709363', '2311410', '322245', 'S', 40, '1.320,00', '', '', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(255, '64601340306', '7156650', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(256, '01147215308', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '', '146,52', '1.848,00', '1.702,73', ''),
(257, '87209764372', '2309858', '322245', 'S', 40, '1.320,00', '', '', '100,00', '108,00', '1.420,00', '1.645,57', ''),
(258, '22834223882', '2460319', '322245', 'S', 40, '1.320,00', '', '', '330,00', '128,70', '1.650,00', '1.514,10', ''),
(259, '76684440330', '2311410', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '330,00', '176,22', '2.178,00', '1.514,10', ''),
(260, '02081096331', '7156650', '223565', 'S', 40, '2.800,00', '', '', '', '272,72', '2.800,00', '', 'Carga horária incompatível'),
(261, '57072680306', '2460335', '322205', 'S', 36, '1.320,00', '264,00', '264,00', '132,00', '158,40', '1.980,00', '1.325,00', ''),
(262, '25285017300', '2460335', '322230', 'S', 36, '1.320,00', '264,00', '264,00', '330,00', '176,22', '2.178,00', '', 'Profissional não cadastrado no COFEN'),
(263, '28035763334', '2460335', '322205', 'S', 36, '1.320,00', '264,00', '264,00', '480,00', '179,20', '2.328,00', '1.126,09', ''),
(264, '74846728315', '2460335', '223505', 'S', 40, '2.281,56', '912,62', '456,31', '', '467,12', '3.650,49', '2.036,62', ''),
(265, '04426140390', '5906091', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(266, '82693838304', '2460335', '322230', 'S', 40, '1.320,00', '264,00', '', '330,00', '1.452,46', '1.914,00', '', 'Profissional não cadastrado no COFEN'),
(267, '03527558306', '0216992', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(268, '64930947391', '2460270', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(269, '03525154305', '3990648', '223505', 'S', 30, '2.240,00', '', '', '', '730,70', '2.240,00', '998,64', ''),
(270, '03525154305', '2309882', '223565', 'S', 40, '2.800,00', '', '', '780,00', '449,35', '3.580,00', '1.003,30', ''),
(271, '76973522300', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '1.230,00', '338,42', '3.078,00', '999,66', ''),
(272, '49289721391', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '432,00', '158,40', '2.280,00', '', 'Carga horária incompatível'),
(273, '03989544373', '6642942', '223565', 'S', 40, '2.800,00', '', '', '125,00', '295,97', '2.925,00', '1.435,67', ''),
(274, '02591206341', '5906091', '223565', 'S', 40, '2.706,67', '', '', '', '255,36', '2.706,67', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(275, '74798073334', '2460335', '223505', 'S', 40, '1.571,00', '314,20', '314,20', '350,00', '226,72', '2.549,40', '2.516,15', ''),
(276, '01294530305', '2311410', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(277, '94447578387', '2460335', '223505', 'S', 20, '1.571,00', '314,20', '314,20', '70,00', '184,44', '2.269,40', '541,88', ''),
(278, '74960024372', '2309890', '223565', 'S', 40, '2.800,00', '', '', '', '272,72', '2.800,00', '1.518,18', ''),
(279, '25562827387', '2460319', '223565', 'S', 40, '2.800,00', '', '', '440,00', '363,67', '3.240,00', '1.227,74', ''),
(280, '02908311305', '5068770', '223565', 'S', 40, '2.800,00', '', '', '125,00', '295,97', '2.925,00', '1.435,67', ''),
(281, '05343352332', '2309858', '223565', 'S', 40, '2.800,00', '', '', '435,00', '362,41', '3.235,00', '1.231,04', ''),
(282, '99045591391', '7512104', '223505', 'S', 40, '2.800,00', '', '', '650,00', '416,59', '3.450,00', '1.089,12', ''),
(283, '64489850344', '2311410', '223565', 'S', 40, '2.800,00', '', '', '', '272,72', '2.800,00', '1.518,18', ''),
(284, '03328858288', '5068770', '322250', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '839,09', ''),
(285, '00827153350', '2311410', '223565', 'S', 40, '2.800,00', '', '', '', '272,72', '2.800,00', '1.518,18', ''),
(286, '70748691391', '2460270', '223565', 'S', 40, '2.800,00', '', '', '125,00', '295,97', '2.925,00', '1.435,67', ''),
(287, '75093375349', '0911658', '223565', 'S', 40, '2.800,00', '', '', '', '272,72', '2.800,00', '1.518,18', ''),
(288, '29503092833', '6642942', '322245', 'S', 40, '1.320,00', '', '', '220,00', '118,80', '1.540,00', '1.576,98', ''),
(289, '61759807354', '2309890', '322245', 'S', 40, '1.320,00', '', '', '125,00', '110,25', '1.445,00', '1.631,28', ''),
(290, '00523927320', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '132,00', '219,85', '1.980,00', '', 'Carga horária incompatível'),
(291, '01372849343', '2460335', '223505', 'S', 20, '1.571,00', '314,20', '314,20', '35,00', '181,29', '2.234,40', '564,99', ''),
(292, '53051602353', '2311410', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '330,00', '176,22', '2.178,00', '1.514,10', ''),
(293, '01735758388', '2309882', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(294, '03567695347', '0911747', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(295, '02853745325', '0911658', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(296, '04039539362', '0911747', '223565', 'S', 40, '2.800,00', '', '', '780,00', '449,35', '3.580,00', '1.003,30', ''),
(297, '62939173320', '2311410', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '132,00', '158,40', '1.980,00', '', 'Carga horária incompatível'),
(298, '00430230370', '2460335', '223505', 'S', 40, '1.571,00', '314,20', '314,20', '3.835,00', '1.210,02', '6.034,40', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(299, '00548717354', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '865,00', '256,54', '2.713,00', '1.208,29', ''),
(300, '00744810370', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '202,00', '164,70', '2.050,00', '1.587,26', ''),
(301, '03484225394', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '335,00', '149,67', '2.183,00', '1.511,24', ''),
(302, '03887064305', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '105,00', '155,97', '1.953,00', '1.642,71', ''),
(303, '05056956341', '2460335', '322205', 'S', 40, '1.320,00', '', '', '220,00', '118,80', '1.540,00', '1.576,98', ''),
(304, '06024021313', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '175,00', '162,27', '2.023,00', '1.602,70', ''),
(305, '07198049303', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '', '146,52', '1.848,00', '1.702,73', ''),
(306, '07634570354', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '70,00', '146,52', '1.918,00', '1.662,72', ''),
(307, '60675963346', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '35,00', '149,67', '1.883,00', '1.682,72', ''),
(308, '60846634350', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '70,00', '152,82', '1.918,00', '1.662,72', ''),
(309, '81736029304', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '132,00', '158,40', '1.980,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(310, '83488499391', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '735,00', '207,07', '2.583,00', '1.282,60', ''),
(311, '97967181387', '2460335', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(312, '98065777368', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '35,00', '149,67', '1.883,00', '1.682,72', ''),
(313, '00349775389', '2460335', '322205', 'S', 40, '1.320,00', '264,00', '264,00', '370,00', '152,82', '2.218,00', '', 'Profissional não cadastrado no COFEN'),
(314, '03962820329', '2464551', '322205', 'S', 40, '1.779,82', '0,00', '0,00', '59,82', '135,00', '1.839,64', '1.208,71', ''),
(315, '61355983339', '2464551', '223505', 'S', 40, '2.500,00', '0,00', '0,00', '0,00', '218,91', '2.500,00', '1.818,18', ''),
(316, '60661107302', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(317, '73659770353', '2464225', '322230', 'S', 40, '1.689,60', '0,00', '105,60', '0,00', '886,37', '1.795,20', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(318, '61360280340', '2464233', '322245', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(319, '06797327300', '2464233', '223565', 'S', 40, '2.804,00', '0,00', '0,00', '0,00', '237,47', '2.804,00', '1.514,18', ''),
(320, '03694284397', '2464241', '223565', 'S', 40, '2.804,00', '0,00', '0,00', '0,00', '297,47', '2.804,00', '1.514,18', ''),
(321, '69321582304', '2464241', '322245', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(322, '04211654306', '2464225', '223505', 'S', 40, '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '', 'Remuneração não informada'),
(323, '60882185330', '2464551', '223565', 'S', 40, '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '', 'Remuneração não informada'),
(324, '02248096364', '2464225', '322205', 'S', 40, '3.101,10', '0,08', '105,00', '59,82', '499,72', '3.266,00', '', 'Carga horária incompatível'),
(325, '72269014391', '2464551', '322245', 'S', 40, '1.689,60', '0,08', '105,60', '0,00', '356,29', '1.795,28', '1.333,13', ''),
(326, '81712413368', '2464233', '322205', 'S', 40, '1.689,60', '0,08', '105,60', '0,00', '158,66', '1.795,28', '1.333,13', ''),
(327, '99034565300', '2464241', '322230', 'S', 40, '1.689,60', '0,08', '105,60', '0,00', '158,66', '1.795,28', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(328, '00930859316', '2464233', '322205', 'S', 40, '1.749,42', '0,08', '105,60', '59,82', '556,13', '1.914,92', '1.239,11', ''),
(329, '00168456338', '2464225', '322205', 'S', 40, '1.689,60', '0,08', '105,60', '59,82', '158,66', '1.855,10', '1.298,93', ''),
(330, '73683060344', '2464225', '322230', 'S', 40, '0,00', '0,00', '0,00', '0,00', '0,00', '0,00', '', 'Remuneração não informada'),
(331, '78508380330', '2464225', '322205', 'S', 40, '1.689,60', '0,08', '105,60', '0,00', '158,66', '1.795,28', '', 'Carga horária incompatível'),
(332, '01828013307', '2464551', '322205', 'S', 40, '2.349,60', '0,10', '105,60', '59,82', '997,39', '2.515,12', '638,93', ''),
(333, '44955707300', '2464551', '322205', 'S', 40, '1.821,60', '0,10', '105,60', '0,00', '813,27', '1.927,30', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(334, '00130511307', '2464551', '322205', 'S', 40, '1.689,60', '0,10', '105,60', '59,82', '158,66', '1.855,12', '1.298,93', ''),
(335, '65502272320', '2464551', '322205', 'S', 40, '1.643,82', '0,10', '0,00', '59,82', '149,16', '1.703,74', '1.344,71', ''),
(336, '60977907325', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(337, '06190976395', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(338, '61615297340', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(339, '61621502325', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(340, '05929399360', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(341, '72478985349', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(342, '61318976383', '2464551', '223565', 'S', 40, '2.786,00', '0,00', '0,00', '0,00', '270,12', '2.786,00', '1.532,18', ''),
(343, '05428433310', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(344, '89053036334', '2464551', '223565', 'S', 40, '7.140,00', '0,00', '0,00', '0,00', '1.677,03', '7.140,00', '', 'Remuneração já compatível com o piso estabelecido.'),
(345, '60867098317', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(346, '61843156334', '2464551', '223565', 'S', 40, '2.500,00', '0,00', '0,00', '0,00', '218,91', '2.500,00', '1.818,18', ''),
(347, '06190954316', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(348, '60901537373', '2464551', '322205', 'S', 40, '1.320,00', '0,00', '0,00', '0,00', '99,00', '1.320,00', '1.702,73', ''),
(349, '95165517349', '2307464', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(350, '69853568349', '2307464', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(351, '05116195376', '2307464', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(352, '04357987318', '7383002', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(353, '60758069383', '7064268', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(354, '60372125115', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(355, '60613472357', '2461625', '223505', 'S', 24, '2.300,00', '', '', '', '', '2.300,00', '290,91', ''),
(356, '60613472357', '7064268', '322205', 'S', 40, '2.186,37', '', '', '', '176,97', '2.186,37', '836,36', ''),
(357, '27494853391', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '0,00', '2.300,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(358, '27650086801', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(359, '61224683390', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(360, '26983230353', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '603,82', '1.320,00', '1.702,73', ''),
(361, '60664667392', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(362, '00432745360', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '386,15', '1.320,00', '', 'Carga horária incompatível'),
(363, '28031237387', '2461625', '223505', 'S', 40, '1.320,00', '', '', '', '128,70', '1.320,00', '', 'Carga horária incompatível'),
(364, '01912248395', '2461625', '223505', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Carga horária incompatível'),
(365, '04226017722', '2461625', '223505', 'S', 40, '1.320,00', '', '', '', '128,70', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(366, '03791511386', '2461625', '223505', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Carga horária incompatível'),
(367, '03878747390', '7383002', '223565', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '2.018,18', ''),
(368, '04935982357', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '143,00', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(369, '05349985345', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(370, '60758069383', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(371, '98525212334', '7064314', '322205', 'S', 40, '1.320,00', '', '', '', '539,83', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(372, '05686955344', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(373, '20171951387', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(374, '04348279322', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(375, '95860851391', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Carga horária incompatível'),
(376, '03563010366', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(377, '02418776107', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(378, '06801582356', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '722,73', ''),
(379, '00051027313', '2461625', '322205', 'S', 40, '1.302,00', '', '', '', '97,65', '1.302,00', '1.720,73', ''),
(380, '02832473393', '2461625', '223505', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(381, '49954628304', '2461625', '223505', 'S', 40, '1.320,00', '', '', '', '610,57', '1.320,00', '', 'Carga horária incompatível'),
(382, '00899580394', '7383002', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(383, '62178760350', '7064268', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(384, '05561440314', '6750109', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(385, '04833722348', '0854395', '223565', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(386, '90526910100', '0854395', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(387, '47510897300', '7064268', '223565', 'S', 40, '1.320,00', '', '', '', '128,70', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(388, '60171111168', '2461625', '322205', 'S', 24, '1.320,00', '', '', '', '', '1.320,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(389, '00367170370', '7064314', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(390, '04000500309', '7383002', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(391, '01695171365', '2307464', '223565', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '2.018,18', ''),
(392, '00840784309', '7064314', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', '');
INSERT INTO `tb_piso_enf` (`id`, `cpf`, `cnes_empreg`, `cbo`, `ativo_comp`, `h_total`, `salario_mensal`, `isalubridade`, `add_noturno`, `outros`, `encargos`, `remune_total`, `comple_uniao`, `obs`) VALUES
(393, '92138284387', '7064268', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(394, '36367800344', '6750109', '322245', 'S', 40, '2.700,00', '', '', '', '254,12', '2.700,00', '322,73', ''),
(395, '91661161391', '2307464', '322250', 'S', 40, '2.000,00', '', '', '', '160,20', '2.000,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(396, '60072033363', '7383002', '322250', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(397, '44622163268', '7064268', '322250', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '839,09', ''),
(398, '03563135304', '2461625', '322205', 'S', 40, '1.320,00', '132,00', '', '', '110,88', '1.452,00', '', 'Profissional não cadastrado no COFEN'),
(399, '04357987318', '2461625', '322205', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Carga horária incompatível'),
(400, '05518454309', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Carga horária incompatível'),
(401, '03024688382', '7064314', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(402, '00432745360', '2307464', '322250', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(403, '01912248395', '7383002', '322250', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(404, '49954628304', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(405, '05518454309', '7064314', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(406, '04000500309', '2461625', '322205', 'S', 24, '1.320,00', '', '', '', '', '1.320,00', '493,64', ''),
(407, '83468102372', '2461625', '322205', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(408, '95860851391', '7064268', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(409, '03791511386', '0854395', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(410, '18050875334', '7064268', '322250', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(411, '83574891334', '6750109', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(412, '60614584361', '6750109', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(413, '47510897300', '7064314', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(414, '04833722348', '6750109', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(415, '61224683390', '0854395', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(416, '83952063304', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '544,19', '1.320,00', '1.702,73', ''),
(417, '95068520306', '2461625', '223505', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '2.018,18', ''),
(418, '05686955344', '7064314', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(419, '69704961391', '7064268', '322205', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '1.702,73', ''),
(420, '91661161391', '2461625', '223505', 'S', 24, '2.300,00', '', '', '', '', '2.300,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(421, '00367170370', '2461625', '322205', 'S', 24, '1.320,00', '', '', '', '', '1.320,00', '493,64', ''),
(422, '05683460336', '2461625', '322205', 'S', 36, '1.320,00', '', '', '', '', '1.320,00', '1.400,45', ''),
(423, '98525212334', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(424, '02832473393', '7383002', '223565', 'S', 40, '2.300,00', '', '', '', '', '2.300,00', '', 'Carga horária incompatível'),
(425, '44622163268', '2461625', '322205', 'S', 24, '1.320,00', '', '', '', '', '1.320,00', '493,64', ''),
(426, '28031237387', '2461625', '322205', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Carga horária incompatível'),
(427, '05009469308', '2461625', '223505', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '2.018,18', ''),
(428, '01903819300', '2307464', '223565', 'S', 40, '0,00', '', '', '', '', '0,00', '', 'Remuneração não informada'),
(429, '90526910100', '2461625', '322205', 'S', 24, '1.320,00', '', '', '', '', '1.320,00', '493,64', ''),
(430, '92330975104', '2461625', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(431, '60819577308', '2461625', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(432, '64460134349', '6750109', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(433, '54319048253', '2461625', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(434, '60997298367', '2461625', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '1.702,73', ''),
(435, '60171111168', '2461625', '322245', 'S', 40, '1.320,00', '', '', '', '', '1.320,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(436, '00354116355', '6750109', '223565', 'S', 40, '2.300,00', '', '', '', '187,26', '2.300,00', '', 'Mais de 2 Vínculos com Setor Público - Carga horária incompatível'),
(437, '01843823357', '0854395', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(438, '04839970300', '7064314', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(439, '01251224385', '7383002', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(440, '05683460336', '2307464', '223565', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '2.998,18', ''),
(441, '83574891334', '7064314', '322245', 'S', 40, '1.320,00', '', '', '', '110,88', '1.320,00', '', 'Carga horária incompatível'),
(442, '60616493398', '7064268', '322245', 'S', 40, '1.320,00', '', '', '', '99,00', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(443, '18050875334', '0854395', '322245', 'S', 40, '1.320,00', '', '', '', '128,70', '1.320,00', '', 'Carga horária incompatível - Profissional não cadastrado no COFEN'),
(444, '97934321287', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(445, '03449438280', '2603888', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(446, '42573793249', '9474072', '322205', 'S', 20, '1.320,00', '', '594', '', '', '1.914,00', '191,36', ''),
(447, '06215525260', '2603861', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(448, '60968936350', '7614780', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(449, '60961226390', '2461897', '322245', 'S', 20, '1.320,00', '', '264', '', '', '1.584,00', '191,36', ''),
(450, '42456690206', '2603896', '322205', 'S', 40, '1.320,00', '', '660', '', '', '1.980,00', '', 'Profissional não cadastrado no COFEN'),
(451, '00207835233', '2603888', '322245', 'S', 40, '1.320,00', '', '462', '', '', '1.782,00', '1.702,73', ''),
(452, '01843292300', '2461897', '223505', 'S', 20, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(453, '76489051249', '2461897', '322205', 'S', 20, '1.320,00', '', '594', '', '', '1.914,00', '191,36', ''),
(454, '60613539362', '7464762', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(455, '61526509253', '2461897', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(456, '46755004391', '2603896', '322205', 'S', 40, '1.320,00', '', '1.231,94', '', '', '2.551,94', '1.702,73', ''),
(457, '99672472315', '7464762', '322430', 'S', 40, '1.320,00', '', '462', '', '', '1.782,00', '', 'CBO incompatível com o Piso de Enfermagem'),
(458, '04473576388', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(459, '38133547253', '2461897', '322205', 'S', 40, '1.320,00', '', '1.055,94', '', '', '2.375,94', '1.702,73', ''),
(460, '99855119304', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN'),
(461, '87627000300', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(462, '60150426305', '2461897', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(463, '03649789299', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '', 'Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(464, '70319200272', '2461897', '322245', 'S', 40, '1.320,00', '', '1.000,00', '', '', '2.320,00', '', 'Carga horária incompatível'),
(465, '70028940210', '2461897', '413115', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '', 'CBO incompatível com o Piso de Enfermagem - Profissional não cadastrado no COFEN'),
(466, '03410794212', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(467, '04172087230', '2461897', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(468, '01990099297', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(469, '06148931354', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(470, '00155273361', '2461897', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(471, '01463477309', '2603896', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(472, '63258788332', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(473, '60596848234', '2461897', '131205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '', 'CBO incompatível com o Piso de Enfermagem - Profissional não cadastrado no COFEN - Profissional cadastrado no COFEN'),
(474, '05178027329', '7464762', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(475, '61269268384', '2603896', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(476, '00472025309', '2603896', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(477, '00815599331', '2603896', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(478, '72457791200', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(479, '91263751334', '2461897', '223505', 'S', 20, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(480, '03334383296', '9150501', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(481, '61619316307', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(482, '60309851327', '7464762', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(483, '05670251369', '2461897', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(484, '02588534333', '2461897', '322230', 'S', 40, '1.320,00', '', '660', '', '', '1.980,00', '839,09', ''),
(485, '07237301306', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(486, '61838796304', '2603896', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(487, '02683715200', '7510055', '322205', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(488, '60347226329', '2461897', '322205', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', ''),
(489, '00692900322', '2461897', '322230', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(490, '91972132334', '2603896', '322205', 'S', 40, '1.320,00', '', '396', '', '', '1.716,00', '', 'Profissional não cadastrado no COFEN'),
(491, '04013196360', '7464762', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(492, '07631949301', '2603888', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(493, '29016924353', '2603888', '322250', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(494, '60959574352', '9150501', '223565', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(495, '01563836246', '6435947', '223505', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '2.998,18', ''),
(496, '69989150206', '2461897', '322205', 'S', 20, '1.320,00', '', '462', '', '', '1.782,00', '191,36', ''),
(497, '82967067253', '2461897', '223505', 'S', 20, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(498, '52872181334', '2461897', '322205', 'S', 40, '1.320,00', '', '726', '', '', '2.046,00', '1.702,73', ''),
(499, '46075674349', '2603896', '322230', 'S', 40, '1.320,00', '', '396', '', '', '1.716,00', '839,09', ''),
(500, '99363500306', '2461897', '322205', 'S', 20, '1.320,00', '', '528', '', '', '1.848,00', '191,36', ''),
(501, '01572127341', '7614780', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(502, '00089976240', '2461897', '322205', 'S', 20, '1.320,00', '', '594', '', '', '1.914,00', '191,36', ''),
(503, '04802785399', '2461897', '322205', 'S', 20, '1.320,00', '', '264', '', '', '1.584,00', '191,36', ''),
(504, '95679995387', '2461897', '223505', 'S', 20, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(505, '61622526392', '2461897', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(506, '02715197381', '7614780', '223565', 'S', 20, '1.320,00', '', '0', '', '', '1.320,00', '839,09', ''),
(507, '60155823329', '2603896', '322245', 'S', 40, '1.320,00', '', '0', '', '', '1.320,00', '1.702,73', ''),
(508, '60154987301', '2461897', '322245', 'S', 40, '1.320,00', '', '264', '', '', '1.584,00', '1.702,73', '');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `cad_pref`
--
ALTER TABLE `cad_pref`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `tb_cnes_prof`
--
ALTER TABLE `tb_cnes_prof`
  ADD PRIMARY KEY (`id`);

--
-- Índices para tabela `tb_piso_enf`
--
ALTER TABLE `tb_piso_enf`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `cad_pref`
--
ALTER TABLE `cad_pref`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `tb_cnes_prof`
--
ALTER TABLE `tb_cnes_prof`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5853;

--
-- AUTO_INCREMENT de tabela `tb_piso_enf`
--
ALTER TABLE `tb_piso_enf`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=509;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
