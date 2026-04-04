/**
 * Image compression utility
 * Canvas API kullanarak tarayıcı tarafında görsel sıkıştırma yapar.
 * Harici kütüphane gerektirmez.
 */

const MAX_FILE_SIZE_MB = 6
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/** Dosya boyutu sınır kontrolü */
export function validateImageSize(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        return {
            valid: false,
            error: `Dosya boyutu çok büyük (${sizeMB} MB). Maksimum ${MAX_FILE_SIZE_MB} MB yüklenebilir.`,
        }
    }
    return { valid: true }
}

/** Canvas ile görsel sıkıştırma
 * @param file       Orijinal File nesnesi
 * @param maxWidthPx Maksimum genişlik (default 1920)
 * @param quality    JPEG kalitesi 0-1 arası (default 0.82)
 */
export async function compressImage(
    file: File,
    maxWidthPx = 1920,
    quality = 0.82
): Promise<File> {
    // SVG veya GIF sıkıştırılmaz
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        return file
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')

                let { width, height } = img
                if (width > maxWidthPx) {
                    height = Math.round((height * maxWidthPx) / width)
                    width = maxWidthPx
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) return resolve(file) // fallback

                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (!blob) return resolve(file) // fallback

                        // Sıkıştırılmış dosyayı orijinal isimle oluştur
                        const ext = file.type === 'image/png' ? 'png' : 'jpg'
                        const baseName = file.name.replace(/\.[^.]+$/, '')
                        const compressed = new File([blob], `${baseName}.${ext}`, {
                            type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                        })

                        // Eğer sıkıştırma büyüttüyse orijinali döndür
                        resolve(compressed.size < file.size ? compressed : file)
                    },
                    file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                    quality
                )
            }

            img.onerror = () => reject(new Error('Görsel okunamadı.'))
            img.src = e.target?.result as string
        }

        reader.onerror = () => reject(new Error('Dosya okunamadı.'))
        reader.readAsDataURL(file)
    })
}
