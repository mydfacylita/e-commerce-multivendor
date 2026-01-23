-- Adicionar campos para dados completos da NF-e na tabela invoice

USE ecommerce;

-- Campos do Emitente
ALTER TABLE invoice ADD COLUMN emitenteIE VARCHAR(20) AFTER emitenteNome;
ALTER TABLE invoice ADD COLUMN emitenteCRT VARCHAR(2) AFTER emitenteIE;
ALTER TABLE invoice ADD COLUMN emitenteLogradouro VARCHAR(255) AFTER emitenteCRT;
ALTER TABLE invoice ADD COLUMN emitenteNumero VARCHAR(60) AFTER emitenteLogradouro;
ALTER TABLE invoice ADD COLUMN emitenteComplemento VARCHAR(60) AFTER emitenteNumero;
ALTER TABLE invoice ADD COLUMN emitenteBairro VARCHAR(60) AFTER emitenteComplemento;
ALTER TABLE invoice ADD COLUMN emitenteMunicipio VARCHAR(60) AFTER emitenteBairro;
ALTER TABLE invoice ADD COLUMN emitenteMunicipioCod VARCHAR(7) AFTER emitenteMunicipio;
ALTER TABLE invoice ADD COLUMN emitenteUF VARCHAR(2) AFTER emitenteMunicipioCod;
ALTER TABLE invoice ADD COLUMN emitenteCEP VARCHAR(8) AFTER emitenteUF;

-- Campos do Destinatário (endereço completo)
ALTER TABLE invoice ADD COLUMN destinatarioLogradouro VARCHAR(255) AFTER destinatarioNome;
ALTER TABLE invoice ADD COLUMN destinatarioNumero VARCHAR(60) AFTER destinatarioLogradouro;
ALTER TABLE invoice ADD COLUMN destinatarioComplemento VARCHAR(60) AFTER destinatarioNumero;
ALTER TABLE invoice ADD COLUMN destinatarioBairro VARCHAR(60) AFTER destinatarioComplemento;
ALTER TABLE invoice ADD COLUMN destinatarioMunicipio VARCHAR(60) AFTER destinatarioBairro;
ALTER TABLE invoice ADD COLUMN destinatarioMunicipioCod VARCHAR(7) AFTER destinatarioMunicipio;
ALTER TABLE invoice ADD COLUMN destinatarioUF VARCHAR(2) AFTER destinatarioMunicipioCod;
ALTER TABLE invoice ADD COLUMN destinatarioCEP VARCHAR(8) AFTER destinatarioUF;

-- XML assinado para envio à SEFAZ
ALTER TABLE invoice ADD COLUMN xmlAssinado LONGTEXT AFTER valorCofins;

SELECT 'Campos de NF-e adicionados com sucesso!' AS status;
