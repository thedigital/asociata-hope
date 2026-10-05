import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { splitClosingPhoto } from '../src/lib/page-body.ts';

describe('splitClosingPhoto', () => {
  const text = '<p>Text</p>';
  const figure = (attributes: string) => `<div class="figure"><img ${attributes}></div>`;

  it('takes the closing photo out of the text, with or without its size', () => {
    for (const attributes of ['src="/media/pages/1200/dog.webp" alt="" loading="lazy"', 'width="397" height="544" src="/media/pages/1200/dog.webp" alt=""']) {
      assert.deepEqual(splitClosingPhoto(`${text}${figure(attributes)}\n`), { body: text, photo: 'dog.webp' }, attributes);
    }
  });

  it('leaves a photo followed by text where it is', () => {
    const body = `${figure('src="/media/pages/1200/dog.webp"')}${text}`;
    assert.deepEqual(splitClosingPhoto(body), { body, photo: null });
  });
});
