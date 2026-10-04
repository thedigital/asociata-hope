import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { serveFile } from '../../../lib/files.ts';
import { UPLOADS_DIR, isSafeFileName } from '../../../lib/media.ts';

export const GET: APIRoute = ({ params, request }) => {
  const file = params.file ?? '';
  if (!isSafeFileName(file) || !file.endsWith('.mp4')) return new Response('Not found', { status: 404 });
  return serveFile(request, join(UPLOADS_DIR, 'videos', file), 'video/mp4');
};
