import type { Locale } from './config.ts';
import { CAT_CHOICE_KEYS, CAT_TEXTS, type CatChoice, type CatText, type ContactValues, type Reason } from '../lib/contact.ts';
import type { Currency, DonationError, Frequency } from '../lib/stripe.ts';

/** Strings of the public forms (contact and donation), in the four site languages. */
export type FormsUi = {
  contact: {
    reason: string;
    choose: string;
    reasons: Record<Reason, string>;
    firstName: string;
    lastName: string;
    email: string;
    dogName: string;
    catName: string;
    animalName: string;
    message: string;
    questionnaire: string;
    questions: Record<CatChoice | CatText, string>;
    options: { [K in CatChoice]: Record<string, string> };
    required: string;
    send: string;
    sent: string;
    sentText: string;
    invalid: string;
    limited: string;
    privacy: string;
    orEmail: string;
  };
  donate: {
    title: string;
    frequency: Record<Frequency, string>;
    currency: string;
    currencies: Record<Currency, string>;
    amount: string;
    other: string;
    submit: string;
    secure: string;
    forAnimal: (name: string) => string;
    product: (frequency: Frequency, animal: string | null) => string;
    errors: Record<DonationError | 'unavailable', string>;
    cancelled: string;
    otherWays: string;
  };
};

const ro: FormsUi = {
  contact: {
    reason: 'Ne contactati pentru',
    choose: 'Alegeti…',
    reasons: { 'adopt-dog': 'Adoptia unui caine', 'adopt-cat': 'Adoptia unei pisici', sponsorship: 'Adoptie virtuala', volunteering: 'Voluntariat', other: 'Alt subiect' },
    firstName: 'Prenume',
    lastName: 'Nume',
    email: 'E-mail',
    dogName: 'Numele catelului pe care doriti sa il adoptati',
    catName: 'Numele pisicii pe care doriti sa o adoptati',
    animalName: 'Numele animalului (optional)',
    message: 'Mesaj',
    questionnaire: 'Chestionar pentru adoptia unei pisici',
    questions: {
      previousCats: 'Ati mai avut pisici? Daca da, va rugam sa ne oferiti detalii',
      housing: 'Care este situatia locuintei?',
      balcony: 'Aveti balcon?',
      nets: 'Pentru siguranta pisicilor adoptate, recomandam montarea unor plase speciale de protectie la ferestre si balcoane (mai rezistente decat plasele pentru insecte). In cazul in care locuiti la apartament, care este situatia dvs.?',
      absence: 'In situatia in care lipsiti mai mult de 2–3 zile, cine se va ocupa de pisica?',
      budget: 'Ce buget lunar estimati pentru intretinerea curenta a pisicii? (hrana, nisip etc.)',
      vetCosts: 'Sunteti pregatit(a) sa acoperiti eventuale cheltuieli veterinare neprevazute (consultatii, analize, interventii)?',
      idealEnvironment: 'Care credeti ca este mediul ideal pt cresterea unei pisici: la curte sau la bloc?',
      plants: 'Aveti plante in locuinta? Daca da, ne puteti spune ce tipuri de plante aveti? (Unele plante pot fi toxice pentru pisici — va putem oferi informatii daca este cazul.)',
      ruralRelatives: 'Aveti rude care locuiesc in mediul rural? Au pisici / catei?',
    },
    options: {
      housing: { owner: 'Proprietate personala', 'rent-allowed': 'Chirie – animalele sunt permise', 'rent-ask': 'Chirie – trebuie să discut cu proprietarul' },
      balcony: { closed: 'Da – este inchis cu geam', open: 'Da – este deschis', netted: 'Da – este protejat cu plasă de siguranta pentru pisici', none: 'Nu' },
      nets: { have: 'Avem deja astfel de plase', willing: 'Suntem dispusi sa montam', 'more-info': 'Dorim mai multe informatii', refuse: 'Nu dorim' },
      absence: { family: 'Membru al familiei', friend: 'Prieten', undecided: 'Nu m-am gandit inca' },
      budget: { 'under-100': 'Sub 100 de lei', '100-200': '100 - 200 de lei', '200-400': '200–400 lei', 'over-400': 'Peste 400 de lei' },
      vetCosts: { yes: 'Da', 'within-means': 'Da, in limita posibilitatilor', undecided: 'Nu m-am gandit', no: 'Nu' },
    },
    required: 'Obligatoriu',
    send: 'Trimite',
    sent: 'Trimis !',
    sentText: 'Mesajul dvs. a fost trimis. Va raspundem cat mai repede.',
    invalid: 'Va rugam sa completati campurile marcate.',
    limited: 'Ati trimis prea multe mesaje. Incercati din nou mai tarziu sau scrieti-ne pe e-mail.',
    privacy: 'Datele trimise sunt folosite doar pentru a va raspunde.',
    orEmail: 'Ne puteti scrie si direct la',
  },
  donate: {
    title: 'Donatie prin plata cu cardul',
    frequency: { once: 'O singură dată', monthly: 'Lunar' },
    currency: 'Moneda',
    currencies: { ron: 'RON (lei)', eur: 'EUR (€)' },
    amount: 'Alege suma',
    other: 'Alta suma',
    submit: 'Donează',
    secure: 'Plata este securizata si procesata de Stripe. Datele cardului nu ajung pe site-ul nostru.',
    forAnimal: (name) => `Donatia dvs. va fi inregistrata pentru ${name}.`,
    product: (frequency, animal) => `${frequency === 'monthly' ? 'Donatie lunara' : 'Donatie'} – Asociatia HOPE${animal ? ` (${animal})` : ''}`,
    errors: {
      amount: 'Suma nu este valida.',
      invalid: 'Formularul nu este valid. Va rugam sa incercati din nou.',
      unavailable: 'Plata cu cardul nu este disponibila momentan. Va rugam sa folositi una dintre celelalte metode de mai jos.',
    },
    cancelled: 'Plata a fost anulata. Nu a fost retrasa nicio suma.',
    otherWays: 'Alte modalitati de a dona',
  },
};

const en: FormsUi = {
  contact: {
    reason: 'You are contacting us about',
    choose: 'Choose…',
    reasons: { 'adopt-dog': 'Adopting a dog', 'adopt-cat': 'Adopting a cat', sponsorship: 'Sponsoring an animal', volunteering: 'Volunteering', other: 'Something else' },
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    dogName: 'Name of the dog you would like to adopt',
    catName: 'Name of the cat you would like to adopt',
    animalName: 'Name of the animal (optional)',
    message: 'Message',
    questionnaire: 'Cat adoption questionnaire',
    questions: {
      previousCats: 'Have you had cats before? If so, please give us some details',
      housing: 'What is your housing situation?',
      balcony: 'Do you have a balcony?',
      nets: 'For the safety of adopted cats, we recommend fitting special safety nets on windows and balconies (stronger than insect screens). If you live in an apartment, what is your situation?',
      absence: 'If you are away for more than 2–3 days, who will look after the cat?',
      budget: 'What monthly budget do you expect for the cat’s day-to-day care? (food, litter, etc.)',
      vetCosts: 'Are you prepared to cover unexpected veterinary costs (consultations, tests, surgery)?',
      idealEnvironment: 'In your opinion, what is the ideal environment for a cat: a house with a yard or an apartment?',
      plants: 'Do you have plants at home? If so, which kinds? (Some plants are toxic to cats — we can give you information if needed.)',
      ruralRelatives: 'Do you have relatives living in the countryside? Do they have cats or dogs?',
    },
    options: {
      housing: { owner: 'I own my home', 'rent-allowed': 'Renting – pets are allowed', 'rent-ask': 'Renting – I need to ask the landlord' },
      balcony: { closed: 'Yes – glazed (enclosed)', open: 'Yes – open', netted: 'Yes – protected with a cat safety net', none: 'No' },
      nets: { have: 'We already have such nets', willing: 'We are willing to fit them', 'more-info': 'We would like more information', refuse: 'We do not want them' },
      absence: { family: 'A family member', friend: 'A friend', undecided: 'I have not thought about it yet' },
      budget: { 'under-100': 'Under 100 lei', '100-200': '100 – 200 lei', '200-400': '200 – 400 lei', 'over-400': 'Over 400 lei' },
      vetCosts: { yes: 'Yes', 'within-means': 'Yes, within my means', undecided: 'I have not thought about it', no: 'No' },
    },
    required: 'Required',
    send: 'Send',
    sent: 'Sent!',
    sentText: 'Your message has been sent. We will reply as soon as we can.',
    invalid: 'Please fill in the highlighted fields.',
    limited: 'You have sent too many messages. Please try again later or email us.',
    privacy: 'The information you send is only used to reply to you.',
    orEmail: 'You can also write to us directly at',
  },
  donate: {
    title: 'Donate by card',
    frequency: { once: 'One time', monthly: 'Monthly' },
    currency: 'Currency',
    currencies: { ron: 'RON (lei)', eur: 'EUR (€)' },
    amount: 'Choose an amount',
    other: 'Other amount',
    submit: 'Donate',
    secure: 'Payment is secure and processed by Stripe. Your card details never reach our website.',
    forAnimal: (name) => `Your donation will be recorded for ${name}.`,
    product: (frequency, animal) => `${frequency === 'monthly' ? 'Monthly donation' : 'Donation'} – HOPE association${animal ? ` (${animal})` : ''}`,
    errors: {
      amount: 'The amount is not valid.',
      invalid: 'The form is not valid. Please try again.',
      unavailable: 'Card payment is temporarily unavailable. Please use one of the other methods below.',
    },
    cancelled: 'The payment was cancelled. Nothing has been charged.',
    otherWays: 'Other ways to donate',
  },
};

const fr: FormsUi = {
  contact: {
    reason: 'Vous nous contactez pour',
    choose: 'Choisir…',
    reasons: { 'adopt-dog': 'Adopter un chien', 'adopt-cat': 'Adopter un chat', sponsorship: 'Parrainer un animal', volunteering: 'Bénévolat', other: 'Autre sujet' },
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'E-mail',
    dogName: 'Nom du chien que vous souhaitez adopter',
    catName: 'Nom du chat que vous souhaitez adopter',
    animalName: 'Nom de l’animal (facultatif)',
    message: 'Message',
    questionnaire: 'Questionnaire pour l’adoption d’un chat',
    questions: {
      previousCats: 'Avez-vous déjà eu des chats ? Si oui, merci de nous donner quelques détails',
      housing: 'Quelle est votre situation de logement ?',
      balcony: 'Avez-vous un balcon ?',
      nets: 'Pour la sécurité des chats adoptés, nous recommandons la pose de filets de protection spéciaux aux fenêtres et aux balcons (plus résistants que les moustiquaires). Si vous habitez en appartement, quelle est votre situation ?',
      absence: 'Si vous vous absentez plus de 2 ou 3 jours, qui s’occupera du chat ?',
      budget: 'Quel budget mensuel prévoyez-vous pour l’entretien courant du chat ? (nourriture, litière, etc.)',
      vetCosts: 'Êtes-vous prêt(e) à assumer d’éventuels frais vétérinaires imprévus (consultations, analyses, interventions) ?',
      idealEnvironment: 'Selon vous, quel est l’environnement idéal pour un chat : une maison avec cour ou un appartement ?',
      plants: 'Avez-vous des plantes chez vous ? Si oui, lesquelles ? (Certaines plantes sont toxiques pour les chats — nous pouvons vous renseigner si besoin.)',
      ruralRelatives: 'Avez-vous de la famille à la campagne ? Ont-ils des chats ou des chiens ?',
    },
    options: {
      housing: { owner: 'Propriétaire', 'rent-allowed': 'Locataire – les animaux sont autorisés', 'rent-ask': 'Locataire – je dois en parler au propriétaire' },
      balcony: { closed: 'Oui – il est vitré (fermé)', open: 'Oui – il est ouvert', netted: 'Oui – il est protégé par un filet de sécurité pour chats', none: 'Non' },
      nets: { have: 'Nous avons déjà ces filets', willing: 'Nous sommes prêts à en poser', 'more-info': 'Nous souhaitons plus d’informations', refuse: 'Nous ne le souhaitons pas' },
      absence: { family: 'Un membre de la famille', friend: 'Un ami', undecided: 'Je n’y ai pas encore réfléchi' },
      budget: { 'under-100': 'Moins de 100 lei', '100-200': '100 à 200 lei', '200-400': '200 à 400 lei', 'over-400': 'Plus de 400 lei' },
      vetCosts: { yes: 'Oui', 'within-means': 'Oui, dans la limite de mes moyens', undecided: 'Je n’y ai pas réfléchi', no: 'Non' },
    },
    required: 'Obligatoire',
    send: 'Envoyer',
    sent: 'Envoyé !',
    sentText: 'Votre message a bien été envoyé. Nous vous répondrons dès que possible.',
    invalid: 'Merci de compléter les champs signalés.',
    limited: 'Vous avez envoyé trop de messages. Réessayez plus tard ou écrivez-nous par e-mail.',
    privacy: 'Les informations envoyées servent uniquement à vous répondre.',
    orEmail: 'Vous pouvez aussi nous écrire directement à',
  },
  donate: {
    title: 'Don par carte bancaire',
    frequency: { once: 'Une fois', monthly: 'Chaque mois' },
    currency: 'Devise',
    currencies: { ron: 'RON (lei)', eur: 'EUR (€)' },
    amount: 'Choisissez un montant',
    other: 'Autre montant',
    submit: 'Faire un don',
    secure: 'Le paiement est sécurisé et traité par Stripe. Les données de votre carte ne passent pas par notre site.',
    forAnimal: (name) => `Votre don sera enregistré pour ${name}.`,
    product: (frequency, animal) => `${frequency === 'monthly' ? 'Don mensuel' : 'Don'} – association HOPE${animal ? ` (${animal})` : ''}`,
    errors: {
      amount: 'Le montant n’est pas valide.',
      invalid: 'Le formulaire n’est pas valide. Merci de réessayer.',
      unavailable: 'Le paiement par carte est momentanément indisponible. Merci d’utiliser l’un des autres moyens ci-dessous.',
    },
    cancelled: 'Le paiement a été annulé. Aucun montant n’a été prélevé.',
    otherWays: 'Autres moyens de faire un don',
  },
};

const de: FormsUi = {
  contact: {
    reason: 'Ihr Anliegen',
    choose: 'Bitte wählen …',
    reasons: { 'adopt-dog': 'Adoption eines Hundes', 'adopt-cat': 'Adoption einer Katze', sponsorship: 'Patenschaft', volunteering: 'Ehrenamt', other: 'Anderes Anliegen' },
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    dogName: 'Name des Hundes, den Sie adoptieren möchten',
    catName: 'Name der Katze, die Sie adoptieren möchten',
    animalName: 'Name des Tieres (optional)',
    message: 'Nachricht',
    questionnaire: 'Fragebogen zur Adoption einer Katze',
    questions: {
      previousCats: 'Hatten Sie schon einmal Katzen? Wenn ja, schildern Sie uns bitte Näheres',
      housing: 'Wie ist Ihre Wohnsituation?',
      balcony: 'Haben Sie einen Balkon?',
      nets: 'Zur Sicherheit der adoptierten Katzen empfehlen wir spezielle Schutznetze an Fenstern und Balkonen (stabiler als Fliegengitter). Falls Sie in einer Wohnung leben: Wie ist Ihre Situation?',
      absence: 'Wer kümmert sich um die Katze, wenn Sie länger als 2–3 Tage abwesend sind?',
      budget: 'Mit welchem monatlichen Budget rechnen Sie für den laufenden Unterhalt der Katze? (Futter, Streu usw.)',
      vetCosts: 'Sind Sie bereit, mögliche unvorhergesehene Tierarztkosten zu tragen (Untersuchungen, Analysen, Eingriffe)?',
      idealEnvironment: 'Was ist Ihrer Meinung nach die ideale Umgebung für eine Katze: ein Haus mit Hof oder eine Wohnung?',
      plants: 'Haben Sie Pflanzen in der Wohnung? Wenn ja, welche? (Manche Pflanzen sind für Katzen giftig – wir informieren Sie bei Bedarf gern.)',
      ruralRelatives: 'Haben Sie Verwandte, die auf dem Land leben? Haben diese Katzen oder Hunde?',
    },
    options: {
      housing: { owner: 'Eigentum', 'rent-allowed': 'Miete – Tiere sind erlaubt', 'rent-ask': 'Miete – ich muss mit dem Vermieter sprechen' },
      balcony: { closed: 'Ja – verglast (geschlossen)', open: 'Ja – offen', netted: 'Ja – mit einem Katzenschutznetz gesichert', none: 'Nein' },
      nets: { have: 'Wir haben solche Netze bereits', willing: 'Wir sind bereit, sie anzubringen', 'more-info': 'Wir wünschen weitere Informationen', refuse: 'Das möchten wir nicht' },
      absence: { family: 'Ein Familienmitglied', friend: 'Ein Freund / eine Freundin', undecided: 'Darüber habe ich noch nicht nachgedacht' },
      budget: { 'under-100': 'Unter 100 Lei', '100-200': '100 – 200 Lei', '200-400': '200 – 400 Lei', 'over-400': 'Über 400 Lei' },
      vetCosts: { yes: 'Ja', 'within-means': 'Ja, im Rahmen meiner Möglichkeiten', undecided: 'Darüber habe ich nicht nachgedacht', no: 'Nein' },
    },
    required: 'Pflichtfeld',
    send: 'Senden',
    sent: 'Gesendet!',
    sentText: 'Ihre Nachricht wurde gesendet. Wir antworten so schnell wie möglich.',
    invalid: 'Bitte füllen Sie die markierten Felder aus.',
    limited: 'Sie haben zu viele Nachrichten gesendet. Bitte versuchen Sie es später erneut oder schreiben Sie uns per E-Mail.',
    privacy: 'Die übermittelten Daten werden nur verwendet, um Ihnen zu antworten.',
    orEmail: 'Sie können uns auch direkt schreiben an',
  },
  donate: {
    title: 'Spende per Karte',
    frequency: { once: 'Einmalig', monthly: 'Monatlich' },
    currency: 'Währung',
    currencies: { ron: 'RON (Lei)', eur: 'EUR (€)' },
    amount: 'Betrag wählen',
    other: 'Anderer Betrag',
    submit: 'Spenden',
    secure: 'Die Zahlung ist sicher und wird von Stripe abgewickelt. Ihre Kartendaten gelangen nicht auf unsere Website.',
    forAnimal: (name) => `Ihre Spende wird für ${name} verbucht.`,
    product: (frequency, animal) => `${frequency === 'monthly' ? 'Monatliche Spende' : 'Spende'} – Tierschutzverein HOPE${animal ? ` (${animal})` : ''}`,
    errors: {
      amount: 'Der Betrag ist ungültig.',
      invalid: 'Das Formular ist ungültig. Bitte versuchen Sie es erneut.',
      unavailable: 'Die Kartenzahlung ist vorübergehend nicht verfügbar. Bitte nutzen Sie eine der anderen Möglichkeiten unten.',
    },
    cancelled: 'Die Zahlung wurde abgebrochen. Es wurde nichts abgebucht.',
    otherWays: 'Weitere Spendenmöglichkeiten',
  },
};

const DICTIONARIES: Record<Locale, FormsUi> = { ro, en, fr, de };
export const useFormsUi = (locale: Locale): FormsUi => DICTIONARIES[locale];

/** Plain-text rendering of a message, for the notification e-mail and the admin. */
export function describeContact(values: ContactValues, locale: Locale): string {
  const t = useFormsUi(locale).contact;
  const lines = [
    `${t.reason}: ${values.reason ? t.reasons[values.reason] : '—'}`,
    `${t.firstName}: ${values.firstName}`,
    `${t.lastName}: ${values.lastName}`,
    `${t.email}: ${values.email}`,
  ];
  if (values.animalName) lines.push(`${values.reason === 'adopt-cat' ? t.catName : values.reason === 'adopt-dog' ? t.dogName : t.animalName}: ${values.animalName}`);
  lines.push('', `${t.message}:`, values.message);
  const answered = [...CAT_CHOICE_KEYS, ...CAT_TEXTS].filter((key) => values.answers[key]);
  if (answered.length) {
    lines.push('', `— ${t.questionnaire} —`);
    for (const key of answered) {
      const value = values.answers[key]!;
      const label = (CAT_CHOICE_KEYS as string[]).includes(key) ? (t.options[key as CatChoice][value] ?? value) : value;
      lines.push('', t.questions[key], `→ ${label}`);
    }
  }
  return lines.join('\n');
}
