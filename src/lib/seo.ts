import type { Locale } from '../i18n/config.ts';
import { gendered, joinList, useUi } from '../i18n/ui.ts';
import type { AdoptionType, Color, Sex, Size, Species, Trait } from './taxonomy.ts';

/** The structured facts an animal's search snippet is written from. */
export type SeoFacts = {
  name: string;
  species: Species;
  adoptionType: AdoptionType;
  sex: Sex | null;
  size: Size | null;
  color: Color | null;
  traits: Trait[];
  vaccinated: boolean;
  sterilized: boolean;
  dewormed: boolean;
};

type Wording = {
  /** Page title, without the site name. */
  title: Record<AdoptionType, Record<Species, (name: string) => string>>;
  size: Record<Size, string>;
  /** Closing sentence of the description. */
  call: Record<AdoptionType, Record<Species, string>>;
};

const WORDING: Record<Locale, Wording> = {
  ro: {
    title: {
      real: { dog: (n) => `${n} – adoptie caine Bucuresti`, cat: (n) => `${n} – adoptie pisica Bucuresti` },
      virtual: { dog: (n) => `${n} – adoptie virtuala caine`, cat: (n) => `${n} – adoptie virtuala pisica` },
    },
    size: { small: 'talie mica', medium: 'talie medie', large: 'talie mare' },
    call: {
      real: { dog: 'Adopta un caine de la Asociatia HOPE, Bucuresti.', cat: 'Adopta o pisica de la Asociatia HOPE, Bucuresti.' },
      virtual: { dog: 'Adopta virtual un caine ingrijit de Asociatia HOPE, Bucuresti.', cat: 'Adopta virtual o pisica ingrijita de Asociatia HOPE, Bucuresti.' },
    },
  },
  en: {
    title: {
      real: { dog: (n) => `${n} – dog for adoption in Bucharest`, cat: (n) => `${n} – cat for adoption in Bucharest` },
      virtual: { dog: (n) => `${n} – sponsor a dog`, cat: (n) => `${n} – sponsor a cat` },
    },
    size: { small: 'small', medium: 'medium-sized', large: 'large' },
    call: {
      real: { dog: 'Adopt a dog from the HOPE association in Bucharest.', cat: 'Adopt a cat from the HOPE association in Bucharest.' },
      virtual: { dog: 'Sponsor this dog, cared for by the HOPE association in Bucharest.', cat: 'Sponsor this cat, cared for by the HOPE association in Bucharest.' },
    },
  },
  fr: {
    title: {
      real: { dog: (n) => `${n} – chien à adopter à Bucarest`, cat: (n) => `${n} – chat à adopter à Bucarest` },
      virtual: { dog: (n) => `${n} – chien à parrainer`, cat: (n) => `${n} – chat à parrainer` },
    },
    size: { small: 'petite taille', medium: 'taille moyenne', large: 'grande taille' },
    call: {
      real: { dog: 'Adoptez un chien auprès de l’association HOPE à Bucarest.', cat: 'Adoptez un chat auprès de l’association HOPE à Bucarest.' },
      virtual: { dog: 'Parrainez ce chien pris en charge par l’association HOPE à Bucarest.', cat: 'Parrainez ce chat pris en charge par l’association HOPE à Bucarest.' },
    },
  },
  de: {
    title: {
      real: { dog: (n) => `${n} – Hund zur Adoption in Bukarest`, cat: (n) => `${n} – Katze zur Adoption in Bukarest` },
      virtual: { dog: (n) => `${n} – Patenschaft für einen Hund`, cat: (n) => `${n} – Patenschaft für eine Katze` },
    },
    size: { small: 'klein', medium: 'mittelgroß', large: 'groß' },
    call: {
      real: { dog: 'Adoptieren Sie einen Hund vom Tierschutzverein HOPE in Bukarest.', cat: 'Adoptieren Sie eine Katze vom Tierschutzverein HOPE in Bukarest.' },
      virtual: { dog: 'Übernehmen Sie eine Patenschaft für diesen Hund des Tierschutzvereins HOPE in Bukarest.', cat: 'Übernehmen Sie eine Patenschaft für diese Katze des Tierschutzvereins HOPE in Bukarest.' },
    },
  },
};

/**
 * Search title and description of an animal, written from its structured data only: no age
 * (it would go stale) and nothing taken from the free text, so they stay true in every language.
 */
export function buildAnimalSeo(facts: SeoFacts, locale: Locale): { title: string; description: string } {
  const ui = useUi(locale);
  const wording = WORDING[locale];
  const lower = (label: string) => label.toLowerCase();
  const health = (['vaccinated', 'sterilized', 'dewormed'] as const).filter((key) => facts[key]).map((key) => lower(gendered(ui.health[key], facts.sex)));
  const parts = [
    facts.sex ? lower(ui.sex[facts.sex]) : null,
    facts.size ? wording.size[facts.size] : null,
    facts.color ? lower(ui.color[facts.color]) : null,
    facts.traits.length ? joinList(facts.traits.map((trait) => lower(gendered(ui.traits[trait], facts.sex))), ui.and) : null,
    health.length ? joinList(health, ui.and) : null,
  ].filter(Boolean);
  const call = wording.call[facts.adoptionType][facts.species];
  return {
    title: `${wording.title[facts.adoptionType][facts.species](facts.name)} | Hope`,
    description: parts.length ? `${facts.name} – ${parts.join(', ')}. ${call}` : `${facts.name}. ${call}`,
  };
}
