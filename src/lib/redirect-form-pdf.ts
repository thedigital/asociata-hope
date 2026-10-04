import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
// First page of the blank form published by ANAF (static.anaf.ro, 230_OPANAF_15_2021.pdf).
import blankForm from '../assets/anaf-230.pdf?inline';
import { CACHE_DIR } from './media.ts';
import { SITE } from './site.ts';

// Positions in PDF points from the bottom left corner of the A4 page. They belong to this version
// of the form: check them again whenever src/assets/anaf-230.pdf is replaced.
const YEAR_BOXES = { x: [309.2, 327, 345, 362.8], y: 735.5 };
const NONPROFIT_BOX = { x: 223.6, y: 448 };
const FISCAL_CODE = { x: 247, y: 407.5 };
const NAME = { x: 184, y: 385.5 };
const IBAN = { x: 108, y: 363 };

const forms = new Map<number, Uint8Array>();
// A change of blank form or of the association's details gives new file names, so no stale copy is served.
const version = createHash('sha256').update([blankForm, SITE.legalName, SITE.fiscalCode, SITE.iban, JSON.stringify([YEAR_BOXES, NONPROFIT_BOX, FISCAL_CODE, NAME, IBAN])].join('|')).digest('hex').slice(0, 10);
const cacheFile = (year: number) => join(CACHE_DIR, 'forms', `formular-230-${year}-${version}.pdf`);

/**
 * Form 230 for an income year, with the year and the association's details already written in.
 * Built once per year: kept in memory and in the disk cache, then served from there.
 */
export async function redirectFormPdf(year: number): Promise<Uint8Array> {
  const known = forms.get(year) ?? (await readFile(cacheFile(year)).catch(() => null));
  if (known) {
    forms.set(year, known);
    return known;
  }

  const pdf = await PDFDocument.load(Buffer.from(blankForm.slice(blankForm.indexOf(',') + 1), 'base64'));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.getPage(0);
  const centred = (text: string, x: number, y: number, size: number) => page.drawText(text, { x: x - font.widthOfTextAtSize(text, size) / 2, y, size, font });

  [...String(year)].forEach((digit, i) => centred(digit, YEAR_BOXES.x[i], YEAR_BOXES.y, 13));
  centred('X', NONPROFIT_BOX.x, NONPROFIT_BOX.y, 11);
  page.drawText(SITE.fiscalCode, { ...FISCAL_CODE, size: 11, font });
  page.drawText(SITE.legalName.toUpperCase(), { ...NAME, size: 11, font });
  page.drawText(SITE.iban, { ...IBAN, size: 11, font });
  pdf.setTitle(`Formular 230 – ${SITE.legalName} – ${year}`);

  const bytes = await pdf.save();
  forms.set(year, bytes);
  await mkdir(dirname(cacheFile(year)), { recursive: true });
  await writeFile(cacheFile(year), bytes);
  return bytes;
}
