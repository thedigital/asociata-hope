import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../db/client.ts';
import { ATTACHMENT_TYPES, CONTACT_DIR, attachmentName, attachmentType } from '../../../lib/contact.ts';
import { serveFile } from '../../../lib/files.ts';

/** Document joined to a contact message. Like every `/admin` path, only for signed-in users. */
export const GET: APIRoute = async ({ params, request }) => {
  const id = Number(params.id);
  const row = Number.isInteger(id) ? db.select({ attachment: schema.contactMessages.attachment }).from(schema.contactMessages).where(eq(schema.contactMessages.id, id)).get() : undefined;
  const type = row?.attachment ? attachmentType(row.attachment) : undefined;
  if (!row?.attachment || !type) return new Response('Not found', { status: 404 });
  const response = await serveFile(request, join(CONTACT_DIR, row.attachment), ATTACHMENT_TYPES[type]);
  response.headers.set('content-disposition', `inline; filename="${attachmentName(id, type)}"`);
  response.headers.set('cache-control', 'private, no-store');
  return response;
};
