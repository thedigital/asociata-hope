import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';

/**
 * Themes of the public site. A theme sets the main colour of the site (titles, links, buttons,
 * coloured grounds) and the pattern drawn over the title bands and the footer. Everything else
 * (secondary colours, type, layout) is the same in every theme. `classic` is the Wix identity
 * and the default.
 */
export const THEME_IDS = ['classic', 'christmas', 'valentine', 'easter', 'summer', 'halloween'] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = 'classic';

export const PATTERN_IDS = ['paws', 'snowflakes', 'hearts', 'eggs', 'beach', 'pumpkins', 'none'] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

type Gradient = [from: string, middle: string, to: string];

interface Theme {
  /** Main colour of the site, the one offered for change in the admin. */
  color: string;
  /** Hand-picked gradient of the ground; a colour chosen in the admin gets shades of itself instead. */
  gradient: Gradient;
  /** Small accents on a ground of the main colour: title bar, footer headings, key figures. */
  accent: string;
  /** RGB channels of the soft light. */
  glow: string;
  /** Buttons and the donation section, which stand on or beside the main colour, and its darker shade (hover); the Wix orange when absent. */
  call?: [color: string, dark: string];
  pattern: PatternId;
}

const WIX_ORANGE: NonNullable<Theme['call']> = ['#e4572e', '#c5431d'];

export const THEMES: Record<ThemeId, Theme> = {
  // The teal and deep green tokens of global.css.
  classic: { color: '#104f55', gradient: ['#0b3a3f', '#104f55', '#0b5a27'], accent: '#dbb68f', glow: '214 240 190', pattern: 'paws' },
  christmas: { color: '#9c1626', gradient: ['#5f0b17', '#9c1626', '#b8262b'], accent: '#f3cf85', glow: '255 226 170', pattern: 'snowflakes' },
  valentine: { color: '#c42a74', gradient: ['#8a1650', '#c42a74', '#cf3580'], accent: '#ffc9d8', glow: '255 205 222', pattern: 'hearts' },
  // Lilac rather than a pastel: the ground carries white text.
  easter: { color: '#6a479f', gradient: ['#452c74', '#6a479f', '#7f58ad'], accent: '#ffe08a', glow: '255 238 185', pattern: 'eggs' },
  summer: { color: '#0a6a94', gradient: ['#064868', '#0a6a94', '#0b7c8c'], accent: '#ffd97a', glow: '255 242 195', pattern: 'beach' },
  // Pumpkin orange, as dark as white text needs it. The orange buttons would vanish on it: they turn night purple.
  halloween: { color: '#bf4d08', gradient: ['#7a2c05', '#bf4d08', '#c4520c'], accent: '#ffe2a6', glow: '255 214 150', call: ['#4f2a78', '#3b1d5c'], pattern: 'pumpkins' },
};

interface Pattern {
  /** One tile, drawn in white; `opacity` makes it faint. */
  svg: string;
  width: number;
  height: number;
  opacity: number;
}

const PATTERNS: Record<Exclude<PatternId, 'none'>, Pattern> = {
  // Paw prints of the logo.
  paws: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><defs><g id='p'><ellipse cx='14' cy='28' rx='7' ry='9' transform='rotate(-20 14 28)'/><ellipse cx='27' cy='16' rx='7' ry='9.5' transform='rotate(-6 27 16)'/><ellipse cx='42' cy='17' rx='7' ry='9.5' transform='rotate(10 42 17)'/><ellipse cx='53' cy='31' rx='6.5' ry='8.5' transform='rotate(24 53 31)'/><path d='M32 30c-9 0-17 9-17 17 0 6 5 9 10 9 3 0 5-1 7-1s4 1 7 1c5 0 10-3 10-9 0-8-8-17-17-17Z'/></g></defs><g fill='#fff'><use href='#p' transform='translate(14 10) rotate(-18 32 32) scale(.78)'/><use href='#p' transform='translate(112 92) rotate(24 32 32) scale(.56)'/></g></svg>",
    width: 190,
    height: 170,
    opacity: 0.075,
  },
  // Snowflakes of two sizes, a star and falling snow.
  snowflakes: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><defs><path id='a' d='M0 0v-20M0-12l-5-5M0-12l5-5M0-6l-3-3M0-6l3-3'/><g id='f'><use href='#a'/><use href='#a' transform='rotate(60)'/><use href='#a' transform='rotate(120)'/><use href='#a' transform='rotate(180)'/><use href='#a' transform='rotate(240)'/><use href='#a' transform='rotate(300)'/></g></defs><g fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round'><use href='#f' transform='translate(40 42) rotate(12)'/><use href='#f' transform='translate(138 122) rotate(-8) scale(.68)'/></g><g fill='#fff'><path d='M132 22l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z'/><circle cx='88' cy='84' r='2.5'/><circle cx='22' cy='118' r='2'/><circle cx='70' cy='146' r='3'/><circle cx='172' cy='70' r='2'/><circle cx='96' cy='18' r='1.8'/></g></svg>",
    width: 190,
    height: 170,
    opacity: 0.13,
  },
  // Hearts of several sizes, one of them only outlined.
  hearts: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><defs><path id='h' d='M0 10C-15-1-10-12-4-12-1.5-12 0-10 0-8 0-10 1.5-12 4-12 10-12 15-1 0 10Z'/></defs><g fill='#fff'><use href='#h' transform='translate(40 40) rotate(-14) scale(1.7)'/><use href='#h' transform='translate(140 118) rotate(12) scale(1.2)'/><use href='#h' transform='translate(104 30) rotate(8) scale(.55)'/><use href='#h' transform='translate(28 126) rotate(-6) scale(.6)'/><use href='#h' transform='translate(172 52) rotate(-10) scale(.4)'/></g><use href='#h' fill='none' stroke='#fff' stroke-width='1.6' stroke-linejoin='round' transform='translate(88 104) rotate(-8) scale(1.1)'/></svg>",
    width: 190,
    height: 170,
    opacity: 0.1,
  },
  // Decorated Easter eggs.
  eggs: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><defs><path id='e' d='M0-16c7 0 11.5 10 11.5 18a11.5 11.5 0 0 1-23 0c0-8 4.5-18 11.5-18Z'/></defs><g fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><g transform='translate(42 44) rotate(-16) scale(1.25)'><use href='#e'/><path d='M-10.5-3l3.5 3.5 3.5-3.5 3.5 3.5 3.5-3.5 3.5 3.5 3.5-3.5M-10 7q10 4 20 0'/></g><g transform='translate(140 116) rotate(14)'><use href='#e'/><path d='M-9-6q9-4 18 0M-11.5 2q11.5 4 23 0'/></g><g transform='translate(96 132) rotate(-6) scale(.7)'><use href='#e'/><path d='M-11 1h22'/></g><g transform='translate(132 34) rotate(20) scale(.6)'><use href='#e'/><path d='M-10.5-2l3.5 3.5 3.5-3.5 3.5 3.5 3.5-3.5 3.5 3.5 3.5-3.5'/></g></g><g fill='#fff'><circle cx='137' cy='121' r='1.8'/><circle cx='143' cy='123' r='1.8'/><circle cx='80' cy='70' r='2.2'/><circle cx='20' cy='112' r='2'/><circle cx='176' cy='72' r='2'/></g></svg>",
    width: 190,
    height: 170,
    opacity: 0.14,
  },
  // Sun, parasol, starfish and waves.
  beach: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><g fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><circle cx='40' cy='38' r='10'/><path d='M40 20v-6M40 62v-6M22 38h-6M64 38h-6M27.3 25.3l-4.2-4.2M56.9 54.9l-4.2-4.2M27.3 50.7l-4.2 4.2M56.9 21.1l-4.2 4.2'/><path d='M96 86q7-7 14 0t14 0 14 0M12 128q7-7 14 0t14 0 14 0M118 152q6-6 12 0t12 0'/><g transform='translate(142 44) rotate(14)'><path d='M-20 0a20 20 0 0 1 40 0ZM0-20c-5 5-7 12-7 20M0-20c5 5 7 12 7 20M0 0v24'/></g></g><path fill='#fff' d='M82 112l3.4 7.2 7.9 1-5.8 5.5 1.5 7.8-7-3.8-7 3.8 1.5-7.8-5.8-5.5 7.9-1Z'/></svg>",
    width: 190,
    height: 170,
    opacity: 0.14,
  },
  // Pumpkins, bats and a few stars.
  pumpkins: {
    svg: "<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170' viewBox='0 0 190 170'><defs><g id='k'><ellipse rx='18' ry='13.5'/><ellipse rx='8.5' ry='13.5'/><path d='M0-13.5c0-4 2-7 6-8'/></g><path id='b' d='M0 5C-3 1-6 1-8 4-11 1-15 1-18 4-17-4-11-8-4-6L-3-10-1-6 1-6 3-10 4-6C11-8 17-4 18 4 15 1 11 1 8 4 6 1 3 1 0 5Z'/></defs><g fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round'><use href='#k' transform='translate(42 46) rotate(-8) scale(1.15)'/><use href='#k' transform='translate(142 128) rotate(10) scale(.8)'/></g><g fill='#fff'><use href='#b' transform='translate(130 38) rotate(-10) scale(1.1)'/><use href='#b' transform='translate(52 122) rotate(12) scale(.75)'/><path d='M96 80l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z'/><circle cx='174' cy='78' r='2'/><circle cx='16' cy='88' r='2'/><circle cx='96' cy='152' r='2.2'/><circle cx='88' cy='16' r='1.8'/></g></svg>",
    width: 190,
    height: 170,
    opacity: 0.14,
  },
};

const HEX = /^#[0-9a-f]{6}$/;
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
const mix = (hex: string, other: number, amount: number) => toHex(channels(hex).map((c) => c + (other - c) * amount));

/** Contrast ratio of white text on the colour (WCAG). */
function contrastWithWhite(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4));
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/** The ground carries white text: a colour is accepted when that text stays readable. */
export const isBandColor = (value: string) => HEX.test(value) && contrastWithWhite(value) >= 4.5;
export const isThemeId = (value: unknown): value is ThemeId => THEME_IDS.includes(value as ThemeId);
export const isPatternId = (value: unknown): value is PatternId => PATTERN_IDS.includes(value as PatternId);

export interface ThemeChoice {
  color: string;
  pattern: PatternId;
}

interface ThemeSettings {
  active: ThemeId;
  /** Colour and pattern chosen in the admin, per theme; a theme left as designed has no entry. */
  custom: Partial<Record<ThemeId, ThemeChoice>>;
}

const SETTING = 'theme';

/** Stored settings, reduced to what is still valid: an unknown theme or pattern falls back to the defaults. */
export function getThemeSettings(): ThemeSettings {
  const settings: ThemeSettings = { active: DEFAULT_THEME, custom: {} };
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, SETTING)).get();
  if (!row) return settings;
  try {
    const stored = JSON.parse(row.value);
    if (isThemeId(stored.active)) settings.active = stored.active;
    for (const id of THEME_IDS) {
      const choice = stored.custom?.[id];
      if (choice && isBandColor(choice.color) && isPatternId(choice.pattern)) settings.custom[id] = { color: choice.color, pattern: choice.pattern };
    }
  } catch {
    // Unreadable value: the default theme.
  }
  return settings;
}

export function saveThemeSettings(active: ThemeId, choices: Partial<Record<ThemeId, ThemeChoice>>): void {
  const custom: ThemeSettings['custom'] = {};
  for (const id of THEME_IDS) {
    const choice = choices[id];
    if (choice && (choice.color !== THEMES[id].color || choice.pattern !== THEMES[id].pattern)) custom[id] = choice;
  }
  const value = JSON.stringify({ active, custom });
  db.insert(schema.settings).values({ key: SETTING, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value } }).run();
}

/** Colour and pattern of a theme as currently set. */
export const themeChoice = (id: ThemeId, settings: ThemeSettings): ThemeChoice => settings.custom[id] ?? { color: THEMES[id].color, pattern: THEMES[id].pattern };

/** Darker towards the start, slightly lighter towards the end, like the hand-picked gradients. */
const shades = (color: string): Gradient => [mix(color, 0, 0.35), color, mix(color, 255, 0.1)];

const patternUrl = (pattern: Pattern) => `url("data:image/svg+xml,${encodeURIComponent(pattern.svg)}") 0 0 / ${pattern.width}px ${pattern.height}px`;

/** Custom properties read by global.css: `--primary` and `--primary-dark` there are the middle and the start of the gradient. */
export function themeVariables(id: ThemeId, { color, pattern }: ThemeChoice): Record<string, string> {
  const theme = THEMES[id];
  const [from, middle, to] = color === theme.color ? theme.gradient : shades(color);
  return {
    '--band-from': from,
    '--band-middle': middle,
    '--band-to': to,
    '--band-accent': theme.accent,
    '--band-glow': theme.glow,
    '--band-call': (theme.call ?? WIX_ORANGE)[0],
    '--band-call-dark': (theme.call ?? WIX_ORANGE)[1],
    '--band-pattern': pattern === 'none' ? 'none' : patternUrl(PATTERNS[pattern]),
    '--band-pattern-opacity': pattern === 'none' ? '0' : String(PATTERNS[pattern].opacity),
  };
}

const declarations = (variables: Record<string, string>) => Object.entries(variables).map(([name, value]) => `${name}:${value}`).join(';');

/** Every pattern as custom properties, for the previews of the admin. */
export const patternStyles = (): Record<PatternId, string> =>
  Object.fromEntries(
    PATTERN_IDS.map((id) => [id, declarations({ '--band-pattern': id === 'none' ? 'none' : patternUrl(PATTERNS[id]), '--band-pattern-opacity': id === 'none' ? '0' : String(PATTERNS[id].opacity) })]),
  ) as Record<PatternId, string>;

export const themeStyle = (id: ThemeId, choice: ThemeChoice) => declarations(themeVariables(id, choice));

/** Rule placed in the head of every public page: the theme chosen in the admin. */
export function activeThemeCss(): string {
  const settings = getThemeSettings();
  return `:root{${themeStyle(settings.active, themeChoice(settings.active, settings))}}`;
}
