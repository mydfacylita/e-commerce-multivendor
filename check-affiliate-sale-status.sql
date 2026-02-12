SELECT id, orderId, customerName, status, commissionAmount, createdAt 
FROM affiliate_sale 
WHERE orderId = 'cmlja7l8003jy71rqfngw9ky';

SELECT id, status, total, affiliateId, affiliateCode 
FROM `order` 
WHERE id = 'cmlja7l8003jy71rqfngw9ky';
