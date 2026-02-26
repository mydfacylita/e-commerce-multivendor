-- =====================================================
-- Script SQL: Adicionar Regras Fiscais Padrão
-- =====================================================
-- 
-- Este script configura as 3 regras fiscais mais comuns
-- para emissão de NF-e no e-commerce:
-- 
-- 1. CFOP 5102 - Venda Interna (mesmo estado)
-- 2. CFOP 6102 - Venda Interestadual (estados diferentes)
-- 3. CFOP 7102 - Exportação
--
-- IMPORTANTE: Execute este script para cada empresa/filial
-- que precisar emitir NF-e automaticamente.
-- =====================================================

-- =====================================================
-- OPÇÃO 1: Configuração GLOBAL (Matriz)
-- =====================================================
-- Use esta opção para configurar as regras para todas
-- as filiais que não têm configuração específica

INSERT INTO system_config (configKey, configValue, configType)
VALUES (
  'nfe.taxRules',
  '[
    {
      "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
      "tipoOperacao": "interna",
      "cfop": "5102",
      "cstIcms": "00",
      "aliquotaIcms": 0,
      "ativo": true,
      "descricao": "Operação dentro do mesmo estado (UF emitente = UF destinatário)"
    },
    {
      "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
      "tipoOperacao": "interestadual",
      "cfop": "6102",
      "cstIcms": "00",
      "aliquotaIcms": 0,
      "ativo": true,
      "descricao": "Operação entre estados diferentes"
    },
    {
      "nome": "Venda de produção do estabelecimento",
      "tipoOperacao": "exportacao",
      "cfop": "7102",
      "cstIcms": "41",
      "aliquotaIcms": 0,
      "ativo": true,
      "descricao": "Operação de exportação (não tributada)"
    }
  ]',
  'json'
)
ON DUPLICATE KEY UPDATE
  configValue = VALUES(configValue);

-- =====================================================
-- OPÇÃO 2: Configuração por FILIAL
-- =====================================================
-- Use esta opção para configurar regras específicas
-- para cada filial. Substitua 'SP01' pelo código da filial.

-- Exemplo para filial SP01:
UPDATE company_branch
SET nfTaxRulesJson = '[
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interna",
    "cfop": "5102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true,
    "descricao": "Operação dentro do mesmo estado"
  },
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interestadual",
    "cfop": "6102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true,
    "descricao": "Operação entre estados diferentes"
  },
  {
    "nome": "Venda de produção do estabelecimento",
    "tipoOperacao": "exportacao",
    "cfop": "7102",
    "cstIcms": "41",
    "aliquotaIcms": 0,
    "ativo": true,
    "descricao": "Operação de exportação"
  }
]'
WHERE code = 'SP01';

-- Exemplo para filial MA01:
UPDATE company_branch
SET nfTaxRulesJson = '[
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interna",
    "cfop": "5102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true
  },
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interestadual",
    "cfop": "6102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true
  },
  {
    "nome": "Venda de produção do estabelecimento",
    "tipoOperacao": "exportacao",
    "cfop": "7102",
    "cstIcms": "41",
    "aliquotaIcms": 0,
    "ativo": true
  }
]'
WHERE code = 'MA01';

-- =====================================================
-- OPÇÃO 3: Configurar TODAS as filiais de uma vez
-- =====================================================

UPDATE company_branch
SET nfTaxRulesJson = '[
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interna",
    "cfop": "5102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true
  },
  {
    "nome": "Venda de mercadoria adquirida ou recebida de terceiros",
    "tipoOperacao": "interestadual",
    "cfop": "6102",
    "cstIcms": "00",
    "aliquotaIcms": 0,
    "ativo": true
  },
  {
    "nome": "Venda de produção do estabelecimento",
    "tipoOperacao": "exportacao",
    "cfop": "7102",
    "cstIcms": "41",
    "aliquotaIcms": 0,
    "ativo": true
  }
]'
WHERE isActive = 1;

-- =====================================================
-- CONSULTAS ÚTEIS
-- =====================================================

-- Ver regras configuradas globalmente:
SELECT configKey, configValue 
FROM system_config 
WHERE configKey = 'nfe.taxRules';

-- Ver regras configuradas por filial:
SELECT code, name, city, state, 
       JSON_PRETTY(nfTaxRulesJson) as regras_fiscais
FROM company_branch
WHERE nfTaxRulesJson IS NOT NULL;

-- Listar todas as filiais:
SELECT code, name, city, state, 
       CASE WHEN nfTaxRulesJson IS NOT NULL 
            THEN '✓ Configurada' 
            ELSE '✗ Sem regras' 
       END as status_nfe
FROM company_branch
WHERE isActive = 1
ORDER BY code;

-- =====================================================
-- OBSERVAÇÕES
-- =====================================================
-- 
-- 1. Prioridade: Filial > Global
--    - Se a filial tiver nfTaxRulesJson, usa as regras da filial
--    - Se não, usa as regras globais de system_config
--
-- 2. Estrutura das regras:
--    - nome: Descrição da natureza da operação
--    - tipoOperacao: 'interna' | 'interestadual' | 'exportacao'
--    - cfop: Código Fiscal de Operações e Prestações
--    - cstIcms: Código de Situação Tributária do ICMS
--    - aliquotaIcms: Alíquota do ICMS (%)
--    - ativo: true/false (apenas regras ativas são usadas)
--
-- 3. CFOPs mais comuns no e-commerce:
--    - 5102: Venda dentro do estado
--    - 6102: Venda para outro estado
--    - 7102: Exportação
--    - 5101: Venda de produto próprio fabricado (dentro do estado)
--    - 6101: Venda de produto próprio fabricado (outro estado)
--
-- 4. CST ICMS:
--    - 00: Tributada integralmente
--    - 41: Não tributada
--    - 60: ICMS cobrado anteriormente por ST
--    - 101, 102, 103: Simples Nacional
--
-- =====================================================
