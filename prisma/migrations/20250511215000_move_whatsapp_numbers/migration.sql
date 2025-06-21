-- Mover números de WhatsApp de phoneNumber a whatsappNumber para owners
UPDATE users 
SET "whatsappNumber" = "phoneNumber",
    "phoneNumber" = NULL,
    "primaryAuthMethod" = 'WHATSAPP'
WHERE role = 'OWNER' 
AND "phoneNumber" IS NOT NULL 
AND "whatsappNumber" IS NULL;
