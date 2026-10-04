import { join } from 'node:path';
import sharp from 'sharp';
import { UPLOADS_DIR, isSafeFileName, type ImageKind } from './media.ts';

const sizes = new Map<string, { width: number; height: number } | null>();

/** Displayed size of an uploaded image (after EXIF rotation), so the page can reserve its real ratio. */
export async function imageSize(kind: ImageKind, file: string): Promise<{ width: number; height: number } | null> {
  const key = `${kind}/${file}`;
  if (!sizes.has(key)) {
    const meta = isSafeFileName(file) ? await sharp(join(UPLOADS_DIR, kind, file)).metadata().catch(() => null) : null;
    const turned = (meta?.orientation ?? 1) >= 5;
    sizes.set(key, meta?.width && meta.height ? { width: turned ? meta.height : meta.width, height: turned ? meta.width : meta.height } : null);
  }
  return sizes.get(key) ?? null;
}
