INSERT INTO payment_gateway (id, gateway, isActive, config, createdAt, updatedAt) 
VALUES (
  'nubank_pj', 
  'NUBANK', 
  0, 
  '{"clientId": "SEU_CLIENT_ID_NUBANK", "clientSecret": "SEU_CLIENT_SECRET_NUBANK", "environment": "production"}', 
  NOW(), 
  NOW()
) ON DUPLICATE KEY UPDATE 
  gateway = 'NUBANK',
  config = '{"clientId": "SEU_CLIENT_ID_NUBANK", "clientSecret": "SEU_CLIENT_SECRET_NUBANK", "environment": "production"}';
