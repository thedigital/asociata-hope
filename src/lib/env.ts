/**
 * Server-side configuration value. In production it comes from the process environment; under
 * `astro dev` the `.env` file is only exposed through `import.meta.env`, hence the fallback
 * (absent when a script is run directly with Node).
 */
export function env(name: string): string | undefined {
  const fromFile = (import.meta as { env?: Record<string, string | undefined> }).env?.[name];
  return process.env[name] || fromFile || undefined;
}
