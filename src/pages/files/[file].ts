import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { serveFile } from '../../lib/files.ts';
import { UPLOADS_DIR, isSafeFileName } from '../../lib/media.ts';

const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Documents linked from content pages (the Wix `/_files/ugd/*` URLs redirect here). */
export const GET: APIRoute = ({ params, request }) => {
  const file = params.file ?? '';
  const type = TYPES[file.split('.').pop() ?? ''];
  if (!isSafeFileName(file) || !type) return new Response('Not found', { status: 404 });
  return serveFile(request, join(UPLOADS_DIR, 'files', file), type);
};
