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
    let clean = fileName.replace(/^.*[\\\/]/, '');
    clean = clean.replace(/\.\.+/g, '.');
    clean = clean.replace(/[^a-zA-Z0-9._\-]/g, '_');
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

    // Eğer hash formatında ise: salt:hash (PBKDF2 SHA-512)
    const parts = storedHash.split(':');
    if (parts.length === 2 && parts[0].length === 32) {
        const [salt, originalHash] = parts;
        const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        const originalBuf = Buffer.from(originalHash, 'hex');
        const testBuf = Buffer.from(testHash, 'hex');
        if (originalBuf.length !== testBuf.length) return false;
        return crypto.timingSafeEqual(originalBuf, testBuf);
    }

    // Sabit zamanlı (timing-safe) SHA-256 karşılaştırma
    const passBuf = crypto.createHash('sha256').update(password).digest();
    const storedBuf = crypto.createHash('sha256').update(storedHash).digest();
    return crypto.timingSafeEqual(passBuf, storedBuf);
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

    if (rateLimitMap.size > 500) {
        for (const [k, v] of rateLimitMap.entries()) {
            if (now > v.resetAt) rateLimitMap.delete(k);
        }
    }

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

/**
 * Serverless ve Vercel için Kriptografik Olarak İmzalı Durumsuz (Stateless) Oturum Tokenları
 */
export interface SignedSessionPayload {
    userId: string;
    email: string;
    role: string;
    displayName: string;
    createdAt: number;
    expiresAt: number;
}

export class MissingSessionSecretConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissingSessionSecretConfigurationError';
    }
}

/**
 * Oturum İmzalama Anahtarı (Fail-Closed)
 * - Üretimde (production) WORKSPACE_SESSION_SECRET zorunludur ve en az 32 karakter olmalıdır.
 * - SUPABASE_SERVICE_ROLE_KEY asla oturum anahtarı olarak kullanılmaz; iki sır tamamen ayrıdır.
 * - Üretimde eksik/yetersiz secret durumunda geçici bellek içi anahtar türetilmez; açıkça hata fırlatılır (fail-closed).
 */
export function getSessionSignSecret(): string {
    const secret = process.env.WORKSPACE_SESSION_SECRET;

    if (secret && secret.trim().length >= 32) {
        return secret.trim();
    }

    // Üretim ortamında kesinlikle fail-closed
    if (process.env.NODE_ENV === 'production') {
        throw new MissingSessionSecretConfigurationError(
            '[SECURITY CONFIGURATION ERROR] WORKSPACE_SESSION_SECRET is missing, empty, or shorter than 32 characters in production. Configure WORKSPACE_SESSION_SECRET in your production environment variables.'
        );
    }

    // Yalnızca yerel geliştirme ve test ortamı için sabit anahtar (üretimde asla çalışmaz)
    return 'hsd_mtu_dev_test_session_secret_32bytes_minimum_length_for_local!';
}

export function createSignedSessionToken(
    payload: Omit<SignedSessionPayload, 'createdAt' | 'expiresAt'>,
    ttlSeconds: number = 7 * 24 * 3600
): string {
    const now = Date.now();
    const fullPayload: SignedSessionPayload = {
        ...payload,
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
    };
    const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const secret = getSessionSignSecret();
    const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('hex');
    return `${dataStr}.${signature}`;
}

export function verifySignedSessionToken(token: string): SignedSessionPayload | null {
    try {
        if (!token || typeof token !== 'string') return null;
        const [dataStr, signature] = token.split('.');
        if (!dataStr || !signature) return null;

        const secret = getSessionSignSecret();
        const expectedSig = crypto.createHmac('sha256', secret).update(dataStr).digest('hex');
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expectedSig, 'hex');
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }

        const payload: SignedSessionPayload = JSON.parse(Buffer.from(dataStr, 'base64url').toString('utf8'));
        if (Date.now() > payload.expiresAt) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
