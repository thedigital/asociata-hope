declare namespace App {
  interface Locals {
    /** Set by the middleware on /admin routes when the session cookie is valid. */
    user?: import('./lib/auth.ts').AdminUser;
    /** Set by the middleware for every page: inline scripts and styles carry it to pass the Content-Security-Policy. */
    cspNonce: string;
  }
}
