import { REDIRECT_FORM_URL } from './site.ts';

// A keycap digit (1️⃣ … 🔟) at the start of a line numbers a section on several Wix pages.
const KEYCAP = String.raw`(?:[0-9]\uFE0F?\u20E3|\u{1F51F})`;
const STARTS_WITH_KEYCAP = new RegExp(`^\\s*${KEYCAP}`, 'u');
const KEYCAP_PARAGRAPH = new RegExp(`<p>\\s*(${KEYCAP}[^<]{1,120})<\\/p>`, 'gu');

// A document offered at the end of a Wix page: a sentence, the preview linked to the file, then "click on the image".
const CLOSING_DOWNLOAD = /<p>([^<]{1,120})<\/p>\s*<div class="figure"><a href="(\/files\/[^"]+)"><img src="\/media\/pages\/\d+\/([^"]+)"[^>]*><\/a><\/div>\s*<p>[^<]{1,80}<\/p>\s*$/;

/**
 * Gives every language of a page the same structure. Wix stored the same page differently from one
 * language to the next: headings typed as bold or numbered paragraphs, lists typed as lines that
 * start with a dash. These are turned into real headings and lists, so one stylesheet presents
 * every language the same way. Applied to every content page at display; the stored body is untouched.
 * `labels` are the texts of a download block in the language of the page: its button and the note under a Word document.
 */
export function structureBody(body: string, labels = { download: 'Download', wordDocument: '' }): string {
  return (
    fixRedirectFormLink(body)
      // The document that closes a page becomes a download block: small preview, the sentence as its title, a button.
      .replace(
        CLOSING_DOWNLOAD,
        (_, title: string, href: string, file: string) =>
          `<div class="download"><img src="/media/pages/400/${file}" alt="" loading="lazy"><div class="download__text"><p class="download__title">${title.trim()}</p>${/\.docx?$/.test(href) && labels.wordDocument ? `<p class="download__note">${labels.wordDocument}</p>` : ''}<a class="button" href="${href}">${labels.download}</a></div></div>`,
      )
      // A paragraph that opens with a line break or a hard space (the text under a numbered title on Wix).
      .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)+/g, '<p>')
      // A paragraph that is one bold phrase is a heading, unless it is a "label: value" line (bank details).
      .replace(/<p>\s*<strong>([^<]{1,120})<\/strong>\s*<\/p>/g, (match, text: string) => (text.includes(':') ? match : STARTS_WITH_KEYCAP.test(text) ? `<h3>${text.trim()}</h3>` : `<h2>${text.trim()}</h2>`))
      .replace(KEYCAP_PARAGRAPH, '<h3>$1</h3>')
      // "3. Title" alone in a short paragraph.
      .replace(/<p>(\d{1,2}\.\s[^<]{1,110})<\/p>/g, '<h2>$1</h2>')
      // Lines that start with a dash are a list, whether they are separate paragraphs…
      .replace(/(?:<p>(?:&ndash;|[–-])\s[^]*?<\/p>\s*){2,}/g, (run) => `<ul>${run.replace(/<p>(?:&ndash;|[–-])\s([^]*?)<\/p>\s*/g, '<li>$1</li>')}</ul>\n`)
      // …or lines of one paragraph, after an introduction.
      .replace(/<p>((?:(?!<\/p>)[^])*?)((?:<br\s*\/?>\s*(?:&ndash;|[–-])\s(?:(?!<br|<\/p>)[^])*){2,})<\/p>/g, (_, intro: string, lines: string) => {
        const items = lines.split(/<br\s*\/?>\s*(?:&ndash;|[–-])\s/).slice(1);
        return `${intro.trim() ? `<p>${intro.trim()}</p>` : ''}<ul>${items.map((item) => `<li>${item.trim()}</li>`).join('')}</ul>`;
      })
  );
}

/**
 * The link to the 3.5 % redirection form was pasted into Wix in a shortened form: its text is cut
 * ("…protectia.../"), one language links to that cut address (404), others carry a Facebook tracking
 * parameter and one has the cut address as plain text. All of them become the full address, linked.
 */
function fixRedirectFormLink(body: string): string {
  const link = `<a href="${REDIRECT_FORM_URL}" rel="noopener" target="_blank">${REDIRECT_FORM_URL}</a>`;
  return body
    .replace(/<a\s[^>]*href="https:\/\/redirectioneaza\.ro\/asociatia-pentru-protectia[^"]*"[^>]*>[^]*?<\/a>/g, link)
    .replace(/https:\/\/redirectioneaza\.ro\/asociatia-pentru-protectia\.\.\.\//g, link);
}

/** Heading levels, lists and images of a body, in order: what must match from one language to the next. */
export function bodyOutline(body: string): { headings: string; lists: number; images: number } {
  const structured = structureBody(body);
  return {
    headings: [...structured.matchAll(/<h([2-6])[\s>]/g)].map((m) => m[1]).join(''),
    lists: (structured.match(/<(?:ul|ol)[\s>]/g) ?? []).length,
    images: (structured.match(/<img[\s>]/g) ?? []).length,
  };
}

/**
 * Takes the photo that closes a body out of the text, for the pages shown with a photo beside the
 * text: it joins the illustration in the photo column instead of ending the text column. A linked
 * image (a document to download) or one followed by text stays where it is.
 */
export function splitClosingPhoto(body: string): { body: string; photo: string | null } {
  const figure = body.match(/<div class="figure"><img src="\/media\/pages\/\d+\/([^"]+)"[^>]*><\/div>\s*$/);
  return figure ? { body: body.slice(0, figure.index), photo: figure[1] } : { body, photo: null };
}
