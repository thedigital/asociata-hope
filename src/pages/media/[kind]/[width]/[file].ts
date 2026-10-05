import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { serveFile } from '../../../../lib/files.ts';
import { CACHE_DIR, IMAGE_KINDS, IMAGE_WIDTHS, UPLOADS_DIR, isSafeFileName, type ImageKind, type ImageWidth } from '../../../../lib/media.ts';

/**
 * Resized WebP copy of an uploaded image, generated once and then served from the disk cache.
 * Nothing is held in memory: the copy is written by sharp from the original file, then streamed.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const kind = params.kind as ImageKind;
  const width = Number(params.width) as ImageWidth;
  const file = params.file ?? '';
  if (!IMAGE_KINDS.includes(kind) || !IMAGE_WIDTHS.includes(width) || !isSafeFileName(file)) return new Response('Not found', { status: 404 });

  const cached = join(CACHE_DIR, kind, String(width), `${file}.webp`);
  const response = await serveFile(request, cached, 'image/webp');
  if (response.status !== 404) return response;

  await mkdir(dirname(cached), { recursive: true });
  // Written aside then renamed: another request or worker never reads a half-written file.
  const partial = `${cached}.${randomUUID()}.tmp`;
  try {
    await sharp(join(UPLOADS_DIR, kind, file)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(partial);
  } catch {
    // No original with that name, or a file that is not an image.
    await rm(partial, { force: true });
    return new Response('Not found', { status: 404 });
  }
  await rename(partial, cached);
  return serveFile(request, cached, 'image/webp');
};
