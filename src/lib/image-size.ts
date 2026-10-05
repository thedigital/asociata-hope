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

/**
 * Gives the images of a stored page body the size of their file, when the markup has none: the
 * browser then reserves their place before they load, and the text below does not move.
 */
export async function sizeBodyImages(html: string): Promise<string> {
  const tags = [...new Set(html.match(/<img\b[^>]*>/g) ?? [])].filter((tag) => !/\swidth=/.test(tag));
  for (const tag of tags) {
    const file = tag.match(/\ssrc="\/media\/pages\/\d+\/([^"]+)"/)?.[1];
    const size = file ? await imageSize('pages', file) : null;
    if (size) html = html.replaceAll(tag, tag.replace(/^<img/, `<img width="${size.width}" height="${size.height}"`));
  }
  return html;
}
