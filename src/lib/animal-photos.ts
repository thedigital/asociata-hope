import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';

const { animalPhotos } = schema;

export type Photo = typeof animalPhotos.$inferSelect;

/** Main photo of each animal (the first of its gallery), in one query whatever their number. */
export function coverPhotos(animalIds: number[]): Map<number, Photo> {
  if (!animalIds.length) return new Map();
  const rows = db.select().from(animalPhotos).where(and(inArray(animalPhotos.animalId, animalIds), eq(animalPhotos.sortOrder, 0))).all();
  return new Map(rows.map((photo) => [photo.animalId, photo]));
}
