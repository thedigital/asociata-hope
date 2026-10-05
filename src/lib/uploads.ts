import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { CACHE_DIR, IMAGE_WIDTHS, UPLOADS_DIR, type ImageKind } from './media.ts';

export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/**
 * Stores an uploaded picture under a random name. The file is decoded with sharp, so anything that
 * is not a real image is refused whatever its name or declared type (null is returned).
 */
export async function storeImage(kind: ImageKind, upload: File): Promise<{ file: string; width: number; height: number } | null> {
  if (!upload.size || upload.size > MAX_PHOTO_BYTES) return null;
  try {
    const buffer = Buffer.from(await upload.arrayBuffer());
    // Re-encode: applies the EXIF rotation and drops metadata (GPS position included).
    const { data, info } = await sharp(buffer).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
    const file = `${randomBytes(12).toString('hex')}.jpg`;
    await mkdir(join(UPLOADS_DIR, kind), { recursive: true });
    await writeFile(join(UPLOADS_DIR, kind, file), data);
    return { file, width: info.width, height: info.height };
  } catch {
    return null;
  }
}

/** Deletes an uploaded picture and its resized copies. */
export async function removeImage(kind: ImageKind, file: string): Promise<void> {
  await rm(join(UPLOADS_DIR, kind, file), { force: true });
  for (const width of IMAGE_WIDTHS) await rm(join(CACHE_DIR, kind, String(width), `${file}.webp`), { force: true });
}
