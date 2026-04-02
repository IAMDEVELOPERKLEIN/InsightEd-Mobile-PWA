import crypto from 'crypto';
import sharp from 'sharp';

const WEBP_MAX_WIDTH = 1200;
const WEBP_QUALITY = 65;

/**
 * Compress an image buffer to WebP (Extreme Leanness).
 */
export async function compressToWebP(inputBuffer) {
    return sharp(inputBuffer)
        .resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toBuffer();
}

/**
 * Compress a PDF buffer (96 DPI Placeholder).
 * Note: Real 96 DPI reduction usually requires 'pdf-lib' or 'ghostscript'.
 * We deduplicate here to ensure minimal storage regardless.
 */
export async function compressPDF(inputBuffer) {
    // For now, we rely on deduplication for PDFs. 
    // To enable 96 DPI, install 'pdf-lib' and use page-level downsampling.
    return inputBuffer; 
}

/**
 * Compute SHA-256 hex digest of a buffer.
 * @param {Buffer} buf
 * @returns {string}
 */
export function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Determine if a MIME type is an image type we can compress.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isCompressibleImage(mimeType) {
    return /^image\/(jpeg|jpg|png|gif|bmp|tiff|webp)$/i.test(mimeType);
}

/**
 * Upsert a binary into unified_binaries with deduplication.
 * Returns the binary_id (UUID) — existing if duplicate, new if first time.
 *
 * @param {import('pg').Pool} pool
 * @param {Buffer} rawBuffer  — unprocessed upload buffer
 * @param {string} mimeType
 * @returns {Promise<{ binary_id: string, deduplicated: boolean, bytes_saved: number }>}
 */
export async function upsertBinary(pool, rawBuffer, mimeType) {
    let finalBuffer = rawBuffer;
    let finalMime = mimeType;

    if (isCompressibleImage(mimeType)) {
        try {
            finalBuffer = await compressToWebP(rawBuffer);
            finalMime = 'image/webp';
        } catch (err) {
            console.warn('[BinaryPipeline] WebP conversion failed, using original:', err.message);
        }
    } else if (mimeType === 'application/pdf') {
        try {
            finalBuffer = await compressPDF(rawBuffer);
        } catch (err) {
            console.warn('[BinaryPipeline] PDF compression failed, using original:', err.message);
        }
    }

    const hash = sha256(finalBuffer);

    // Deduplication check
    const existing = await pool.query(
        'SELECT id FROM unified_binaries WHERE hash = $1',
        [hash]
    );

    if (existing.rows.length > 0) {
        return {
            binary_id: existing.rows[0].id,
            deduplicated: true,
            bytes_saved: rawBuffer.length
        };
    }

    const insertResult = await pool.query(
        `INSERT INTO unified_binaries (hash, content, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [hash, finalBuffer, finalMime, finalBuffer.length]
    );

    return {
        binary_id: insertResult.rows[0].id,
        deduplicated: false,
        bytes_saved: rawBuffer.length - finalBuffer.length
    };
}
