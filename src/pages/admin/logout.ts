import type { APIRoute } from 'astro';
import { SESSION_COOKIE, deleteSession } from '../../lib/auth.ts';

export const POST: APIRoute = ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
  return redirect('/admin/login', 303);
};
