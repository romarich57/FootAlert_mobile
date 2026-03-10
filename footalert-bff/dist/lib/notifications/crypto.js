import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
const CIPHER_ALGORITHM = 'aes-256-gcm';
export function hashPushToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
function normalizeKey(rawKey) {
    const trimmed = rawKey.trim();
    const asBase64 = Buffer.from(trimmed, 'base64');
    if (asBase64.length === 32) {
        return asBase64;
    }
    return createHash('sha256').update(trimmed).digest();
}
export function encryptPushToken(token, encryptionKey) {
    const key = normalizeKey(encryptionKey);
    const iv = randomBytes(12);
    const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(token, 'utf8'),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${authTag.toString('base64')}.${encrypted.toString('base64')}`;
}
export function decryptPushToken(ciphertext, encryptionKey) {
    const [ivPart, tagPart, payloadPart] = ciphertext.split('.');
    if (!ivPart || !tagPart || !payloadPart) {
        throw new Error('Malformed push token ciphertext.');
    }
    const key = normalizeKey(encryptionKey);
    const iv = Buffer.from(ivPart, 'base64');
    const authTag = Buffer.from(tagPart, 'base64');
    const payload = Buffer.from(payloadPart, 'base64');
    const decipher = createDecipheriv(CIPHER_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(payload),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
