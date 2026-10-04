/**
 * "Formular 230": the Romanian request to redirect up to 3.5 % of one's income tax to a non-profit.
 * It is filled in between 1 January and 25 May for the income of the year before (the dates shown
 * on redirectioneaza.ro, where the online form is closed the rest of the year).
 */
const LAST_DAY = { month: 5, day: 25 };

export interface RedirectCampaign {
  /** True while the online form of redirectioneaza.ro accepts requests. */
  open: boolean;
  /** Year written on the form: the income year the next request is about. */
  incomeYear: number;
  /** Year in which the online form opens again (the current one while it is open). */
  filingYear: number;
}

export function redirectCampaign(now = new Date()): RedirectCampaign {
  // The deadline is a Romanian one, whatever the time zone of the server.
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number);
  const open = month < LAST_DAY.month || (month === LAST_DAY.month && day <= LAST_DAY.day);
  return open ? { open, incomeYear: year - 1, filingYear: year } : { open, incomeYear: year, filingYear: year + 1 };
}

/** Where the paper form is downloaded: generated on request, already filled in for the association. */
export const REDIRECT_FORM_PDF = '/formular-230.pdf';
