import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { CACHE_DIR, IMAGE_KINDS, IMAGE_WIDTHS, UPLOADS_DIR, isSafeFileName, type ImageKind, type ImageWidth } from '../../../../lib/media.ts';

/** Resized WebP copy of an uploaded image, generated once and then served from the disk cache. */
export const GET: APIRoute = async ({ params }) => {
  const kind = params.kind as ImageKind;
  const width = Number(params.width) as ImageWidth;
  const file = params.file ?? '';
  if (!IMAGE_KINDS.includes(kind) || !IMAGE_WIDTHS.includes(width) || !isSafeFileName(file)) return new Response('Not found', { status: 404 });

  const cached = join(CACHE_DIR, kind, String(width), `${file}.webp`);
  let image = await readFile(cached).catch(() => null);
  if (!image) {
    const original = await readFile(join(UPLOADS_DIR, kind, file)).catch(() => null);
    if (!original) return new Response('Not found', { status: 404 });
    image = await sharp(original).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    await mkdir(dirname(cached), { recursive: true });
    await writeFile(cached, image);
  }
  return new Response(new Uint8Array(image), {
    headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' },
  });
};
