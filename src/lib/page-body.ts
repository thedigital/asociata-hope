// A keycap digit (1️⃣ … 🔟) at the start of a line numbers a section on several Wix pages.
const KEYCAP = String.raw`(?:[0-9]\uFE0F?\u20E3|\u{1F51F})`;
const STARTS_WITH_KEYCAP = new RegExp(`^\\s*${KEYCAP}`, 'u');
const KEYCAP_PARAGRAPH = new RegExp(`<p>\\s*(${KEYCAP}[^<]{1,120})<\\/p>`, 'gu');

/**
 * Gives every language of a page the same structure. Wix stored the same page differently from one
 * language to the next: headings typed as bold or numbered paragraphs, lists typed as lines that
 * start with a dash. These are turned into real headings and lists, so one stylesheet presents
 * every language the same way. Applied to every content page at display; the stored body is untouched.
 */
export function structureBody(body: string): string {
  return (
    body
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
 * Moves the photos of a closing gallery beside the paragraphs: the last paragraphs each get one
 * photo, the ones before stay as the introduction. The body is returned unchanged when it is not
 * made of paragraphs followed by a single gallery, or when there are more photos than paragraphs.
 */
export function interleaveGallery(body: string): string {
  const gallery = body.match(/<div class="gallery">([\s\S]*?)<\/div>\s*$/);
  if (!gallery) return body;
  const text = body.slice(0, gallery.index);
  const paragraphs = text.match(/<p[\s>][\s\S]*?<\/p>/g) ?? [];
  const images = gallery[1].match(/<img[^>]*>/g) ?? [];
  const onlyParagraphs = text.replace(/<p[\s>][\s\S]*?<\/p>/g, '').trim() === '';
  if (!onlyParagraphs || !images.length || images.length > paragraphs.length) return body;

  const intro = paragraphs.slice(0, paragraphs.length - images.length);
  // Beside the text a photo takes half the page at most: the 800 px rendition is enough.
  const rows = paragraphs.slice(-images.length).map((paragraph, i) => `<div class="story-row">${images[i].replace('/media/pages/1200/', '/media/pages/800/')}${paragraph}</div>`);
  return [...intro, ...rows].join('\n');
}
