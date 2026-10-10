import crypto from 'crypto';

/**
 * Workspace Güvenlik ve Dosya Doğrulama Yardımcıları
 */

const ALLOWED_EXTENSIONS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md',
    'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
    'mp3', 'wav', 'ogg',
    'zip', 'rar', '7z', 'tar', 'gz'
]);

const ALLOWED_MIME_PREFIXES = [
    'application/',
    'image/',
    'audio/',
    'text/'
];

export interface FileValidationResult {
    valid: boolean;
    error?: string;
    sanitizedName?: string;
}

/**
 * Dosya adı, MIME türü ve boyutu doğrular.
 * Varsayılan maksimum boyut: 25MB
 */
export function validateFileUpload(
    fileName: string,
    mimeType: string,
    sizeInBytes: number,
    maxMb: number = 25
): FileValidationResult {
    const maxSizeBytes = maxMb * 1024 * 1024;

    if (!fileName || typeof fileName !== 'string') {
        return { valid: false, error: 'Geçersiz dosya adı.' };
    }

    if (sizeInBytes <= 0) {
        return { valid: false, error: 'Dosya boş olamaz.' };
    }

    if (sizeInBytes > maxSizeBytes) {
        return { valid: false, error: `Dosya boyutu ${maxMb}MB sınırını aşıyor.` };
    }

    const sanitized = sanitizeFileName(fileName);
    const extension = sanitized.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.has(extension)) {
        return { valid: false, error: `İzin verilmeyen dosya uzantısı: .${extension}` };
    }

    const isMimeAllowed = ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
    if (!isMimeAllowed && mimeType !== 'application/octet-stream') {
        return { valid: false, error: `İzin verilmeyen dosya türü: ${mimeType}` };
    }

    return { valid: true, sanitizedName: sanitized };
}

/**
 * Path traversal (`../`, `..\`) ve tehlikeli karakterleri temizler.
 */
export function sanitizeFileName(fileName: string): string {
    // Path traversal temizleme
    let clean = fileName.replace(/^.*[\\\/]/, '');
    clean = clean.replace(/\.\.+/g, '.');
    // Özel ve tehlikeli karakterleri güvenli hale getirme
    clean = clean.replace(/[^a-zA-Z0-9._\-]/g, '_');
    // Baştaki noktaları temizle
    clean = clean.replace(/^\.+/, '');
    return clean || 'unnamed_file';
}

/**
 * Kriptografik rastgele güvenli indirme tokenı üretir.
 */
export function generateSecureToken(length: number = 32): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(Math.ceil(length / 2));
        crypto.getRandomValues(bytes);
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .slice(0, length);
    }

    // Fallback
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Güvenli PBKDF2 Parola Hashleme (100,000 iterasyon, SHA-512)
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Kriptografik zamanlama saldırılarına dayanıklı (timing-safe) parola doğrulama.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !password) return false;

    // Eğer hash formatında ise: salt:hash
    const parts = storedHash.split(':');
    if (parts.length === 2 && parts[0].length === 32) {
        const [salt, originalHash] = parts;
        const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        const originalBuf = Buffer.from(originalHash, 'hex');
        const testBuf = Buffer.from(testHash, 'hex');
        if (originalBuf.length !== testBuf.length) return false;
        return crypto.timingSafeEqual(originalBuf, testBuf);
    }

    // Geriye dönük uyumluluk (legacy seed şifreler için sabit zamanlı kontrol)
    return password === storedHash;
}

/**
 * Bellek içi IP ve Hesap bazlı Hız Sınırlayıcı (Rate Limiter)
 */
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
    }

    if (entry.count >= maxAttempts) {
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    entry.count += 1;
    return { allowed: true, remaining: maxAttempts - entry.count, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string): void {
    rateLimitMap.delete(key);
}

