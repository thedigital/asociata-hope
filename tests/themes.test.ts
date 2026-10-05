import './helpers/scratch.ts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/client.ts';
import { PATTERN_IDS, THEMES, THEME_IDS, activeThemeCss, getThemeSettings, isBandColor, isPatternId, isThemeId, saveThemeSettings, themeChoice, themeVariables } from '../src/lib/themes.ts';

const storedValue = () => db.select().from(schema.settings).where(eq(schema.settings.key, 'theme')).get()?.value;
const store = (value: string) => db.insert(schema.settings).values({ key: 'theme', value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } }).run();

describe('colours', () => {
  it('accepts a colour only when white text stays readable on it', () => {
    for (const color of ['#000000', '#0f6b6b', '#b3261e']) assert.equal(isBandColor(color), true, color);
    for (const color of ['#ffffff', '#ffd54f', '#7fd1c7']) assert.equal(isBandColor(color), false, color);
    for (const value of ['', 'red', '#fff', '#0F6B6B', '#0f6b6b;color:red', 'url(x)']) assert.equal(isBandColor(value), false, value);
  });

  it('gives every theme a colour that passes its own rule, and a known pattern', () => {
    for (const id of THEME_IDS) {
      assert.equal(isBandColor(THEMES[id].color), true, id);
      assert.equal(isPatternId(THEMES[id].pattern), true, id);
    }
    assert.equal(isThemeId('classic'), true);
    assert.equal(isThemeId('spring'), false);
    assert.equal(isPatternId('stars'), false);
  });
});

describe('settings', () => {
  it('starts with the classic theme as designed', () => {
    assert.deepEqual(getThemeSettings(), { active: 'classic', custom: {} });
    assert.ok(activeThemeCss().includes(`--band-middle:${THEMES.classic.gradient[1]}`));
  });

  it('stores the active theme and only the choices that differ from the design', () => {
    saveThemeSettings('christmas', { classic: { color: THEMES.classic.color, pattern: THEMES.classic.pattern }, christmas: { color: '#7a1020', pattern: 'none' } });
    assert.deepEqual(JSON.parse(storedValue()!), { active: 'christmas', custom: { christmas: { color: '#7a1020', pattern: 'none' } } });
    const settings = getThemeSettings();
    assert.deepEqual(themeChoice('christmas', settings), { color: '#7a1020', pattern: 'none' });
    assert.deepEqual(themeChoice('summer', settings), { color: THEMES.summer.color, pattern: THEMES.summer.pattern });
    const css = activeThemeCss();
    assert.match(css, /^:root\{/);
    assert.ok(css.includes('--band-middle:#7a1020') && css.includes('--band-pattern:none'));
  });

  it('goes back to the design when a theme is reset', () => {
    saveThemeSettings('christmas', { christmas: { color: THEMES.christmas.color, pattern: THEMES.christmas.pattern } });
    assert.deepEqual(getThemeSettings(), { active: 'christmas', custom: {} });
    assert.equal(themeVariables('christmas', themeChoice('christmas', getThemeSettings()))['--band-from'], THEMES.christmas.gradient[0]);
  });

  it('ignores what is stored and no longer valid', () => {
    store(JSON.stringify({ active: 'spring', custom: { classic: { color: '#ffffff', pattern: 'paws' }, summer: { color: '#0f6b6b', pattern: 'stars' }, easter: { color: '#4a2a6a', pattern: 'eggs' } } }));
    assert.deepEqual(getThemeSettings(), { active: 'classic', custom: { easter: { color: '#4a2a6a', pattern: 'eggs' } } });
    store('not json');
    assert.deepEqual(getThemeSettings(), { active: 'classic', custom: {} });
  });
});

describe('themeVariables', () => {
  it('keeps the hand-picked gradient of the design and computes one for another colour', () => {
    for (const id of THEME_IDS) {
      const designed = themeVariables(id, { color: THEMES[id].color, pattern: THEMES[id].pattern });
      assert.deepEqual([designed['--band-from'], designed['--band-middle'], designed['--band-to']], [...THEMES[id].gradient], id);
    }
    const custom = themeVariables('classic', { color: '#204060', pattern: 'paws' });
    assert.equal(custom['--band-middle'], '#204060');
    assert.match(custom['--band-from'], /^#[0-9a-f]{6}$/);
    assert.notEqual(custom['--band-from'], custom['--band-to']);
  });

  it('draws every pattern, and nothing for "none"', () => {
    for (const pattern of PATTERN_IDS) {
      const variables = themeVariables('classic', { color: THEMES.classic.color, pattern });
      if (pattern === 'none') assert.deepEqual([variables['--band-pattern'], variables['--band-pattern-opacity']], ['none', '0']);
      else assert.match(variables['--band-pattern'], /^url\("data:image\/svg\+xml,/, pattern);
    }
  });

  it('gives Halloween its own button colour', () => {
    const call = (id: (typeof THEME_IDS)[number]) => themeVariables(id, { color: THEMES[id].color, pattern: THEMES[id].pattern })['--band-call'];
    assert.equal(call('christmas'), call('classic'));
    assert.notEqual(call('halloween'), call('classic'));
  });
});
