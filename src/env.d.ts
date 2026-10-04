declare namespace App {
  interface Locals {
    /** Set by the middleware on /admin routes when the session cookie is valid. */
    user?: import('./lib/auth.ts').AdminUser;
  }
}
