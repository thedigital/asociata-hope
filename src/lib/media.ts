import { join, resolve } from 'node:path';

/** Uploaded originals and their resized copies live next to the database, outside the build. */
export const DATA_DIR = resolve(process.env.DATA_DIR ?? 'data');
export const UPLOADS_DIR = join(DATA_DIR, 'uploads');
export const CACHE_DIR = join(DATA_DIR, 'cache');

export const IMAGE_KINDS = ['animals', 'pages'] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];
/** Only these widths are generated, so the cache cannot be filled with arbitrary sizes. */
export const IMAGE_WIDTHS = [160, 400, 800, 1200] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/** File names come from the URL: refuse anything that could leave the uploads directory. */
export const isSafeFileName = (name: string) => /^[\w][\w.-]*$/.test(name) && !name.includes('..');

export const imageUrl = (kind: ImageKind, file: string, width: ImageWidth) => `/media/${kind}/${width}/${file}`;

export const srcset = (kind: ImageKind, file: string, widths: readonly ImageWidth[]) =>
  widths.map((w) => `${imageUrl(kind, file, w)} ${w}w`).join(', ');
