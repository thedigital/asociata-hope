import type { APIRoute } from 'astro';
import { redirectFormPdf } from '../lib/redirect-form-pdf.ts';
import { redirectCampaign } from '../lib/redirect-form.ts';

/** Paper version of the 3.5 % redirection form, filled in for the association and for the right year. */
export const GET: APIRoute = async () => {
  const { incomeYear } = redirectCampaign();
  const pdf = await redirectFormPdf(incomeYear);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="formular-230-hope-${incomeYear}.pdf"`,
      // The year changes on 26 May: do not let a copy live longer than a day.
      'cache-control': 'public, max-age=86400',
      'x-robots-tag': 'noindex',
    },
  });
};
