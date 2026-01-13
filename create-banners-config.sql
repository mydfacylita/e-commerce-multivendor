-- Criar configuração padrão dos banners do carrossel
INSERT INTO system_config (key, value, category, label, type, description, created_at, updated_at) 
VALUES (
  'app.banners', 
  '[
    {
      "id": "1",
      "title": "Super Ofertas",
      "subtitle": "Até 50% OFF em produtos selecionados",
      "icon": "🔥",
      "gradient": "linear-gradient(135deg, #f97316, #ea580c)",
      "buttonText": "Ver Ofertas",
      "buttonLink": "/ofertas",
      "active": true,
      "order": 1
    },
    {
      "id": "2",
      "title": "Frete Grátis",
      "subtitle": "Em compras acima de R$ 99",
      "icon": "🚚",
      "gradient": "linear-gradient(135deg, #16a34a, #15803d)",
      "buttonText": "Aproveitar",
      "buttonLink": "/frete-gratis",
      "active": true,
      "order": 2
    },
    {
      "id": "3",
      "title": "Novidades",
      "subtitle": "Confira os produtos recém-chegados",
      "icon": "✨",
      "gradient": "linear-gradient(135deg, #8b5cf6, #7c3aed)",
      "buttonText": "Explorar",
      "buttonLink": "/novidades",
      "active": true,
      "order": 3
    },
    {
      "id": "4",
      "title": "PIX Desconto",
      "subtitle": "5% OFF no pagamento via PIX",
      "icon": "💳",
      "gradient": "linear-gradient(135deg, #2563eb, #1d4ed8)",
      "buttonText": "Usar PIX",
      "buttonLink": "/pix",
      "active": true,
      "order": 4
    }
  ]',
  'app',
  'Banners do Carrossel',
  'json',
  'Configuração dos banners promocionais do carrossel da homepage',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
value = VALUES(value),
updated_at = NOW();