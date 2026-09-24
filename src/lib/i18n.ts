/**
 * English / Marathi interface strings.
 *
 * Staff in Pune read both; borrowers' own records stay in whatever was typed.
 * Only the interface translates - customer names, shop names, loan codes and
 * notes are data and are never touched.
 *
 * The Marathi map is typed `Record<Key, string>`, so a missing translation is
 * a compile error rather than a silent English fallback. Add an English key
 * and the build tells you the Marathi one is missing.
 *
 * Money keeps Latin digits in both languages (see money.ts): Devanagari
 * numerals in a ledger invite transcription errors when figures are copied
 * onto paper receipts, and Indian financial documents use Latin digits
 * regardless of the language of the surrounding text.
 */

export const LOCALES = ["en", "mr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** What the toggle shows - each language named in itself. */
export const LOCALE_LABEL: Record<Locale, string> = { en: "English", mr: "मराठी" };

/** BCP-47 tags for Intl date formatting. */
export const LOCALE_TAG: Record<Locale, string> = { en: "en-IN", mr: "mr-IN" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

const en = {
  /* ------------------------------------------------------------- app shell */
  "app.tagline": "Loan management",
  "app.signOut": "Sign out",
  "app.openMenu": "Open menu",
  "app.closeMenu": "Close menu",
  "app.themeToLight": "Switch to light theme",
  "app.themeToDark": "Switch to dark theme",
  "app.themeLight": "Light theme",
  "app.themeDark": "Dark theme",
  "app.language": "Language",

  /* ------------------------------------------------------------------ nav */
  "nav.group.Overview": "Overview",
  "nav.group.Lending": "Lending",
  "nav.group.Capital": "Capital",
  "nav.group.Business": "Business",
  "nav.dashboard": "Dashboard",
  "nav.collections": "Collections",
  "nav.customers": "Customers",
  "nav.loans": "Loans",
  "nav.payments": "Payments",
  "nav.notifications": "Reminders",
  "nav.investors": "Investors",
  "nav.portfolio": "My portfolio",
  "nav.expenses": "Expenses",
  "nav.reports": "Reports",
  "nav.users": "Users & roles",

  /* ---------------------------------------------------------------- roles */
  "role.ADMIN": "Administrator",
  "role.AGENT": "Agent",
  "role.INVESTOR": "Investor",

  /* ------------------------------------------------------------- greeting */
  "greeting.morning": "Good morning",
  "greeting.afternoon": "Good afternoon",
  "greeting.evening": "Good evening",
  "dashboard.title": "{greeting}, {name}",
  "dashboard.asOn": "Position as on {date}",
  "dashboard.recordPayment": "Record payment",
  "dashboard.newLoan": "New loan",
  "dashboard.keyFigures": "Key figures",

  /* ------------------------------------------------------------ stat tiles */
  "tile.outstanding": "Outstanding",
  "tile.outstanding.hint": "Still to be collected across the whole book",
  "tile.activeLoans.one": "{n} active loan",
  "tile.activeLoans.other": "{n} active loans",
  "tile.overdue": "Overdue",
  "tile.overdue.none": "Nothing past due",
  "tile.overdue.hint": "Past the due date and unpaid",
  "tile.overdue.hintNone": "Every EMI is on schedule",
  "tile.overdue.one": "{n} EMI needs chasing",
  "tile.overdue.other": "{n} EMIs need chasing",
  "tile.dueWeek": "Due this week",
  "tile.dueWeek.hint": "Falls due within the next 7 days",
  "tile.dueWeek.one": "{n} EMI coming up",
  "tile.dueWeek.other": "{n} EMIs coming up",
  "tile.cash": "Cash position",
  "tile.cash.surplus": "In surplus",
  "tile.cash.overdrawn": "Overdrawn",
  "tile.cash.hint": "Investor funds held, after lending, payouts and costs",

  /* ----------------------------------------------------------------- cards */
  "card.cashMovement": "Cash movement",
  "card.bookSummary": "Book summary",
  "card.bookSummary.sub": "Whole business, to date",
  "book.customers": "Customers",
  "book.principal": "Principal deployed",
  "book.collected": "Total collected",
  "book.investorCapital": "Investor capital",
  "book.paidBack": "Paid back to investors",
  "book.expenses": "Expenses to date",

  "card.needsCollection": "Needs collection",
  "card.needsCollection.mixed": "{overdue} overdue, {upcoming} due within 7 days",
  "card.needsCollection.clean": "{upcoming} due within 7 days, nothing overdue",
  "card.needsCollection.emptyTitle": "Nothing to chase",
  "card.needsCollection.emptyBody": "No EMI is overdue or due this week.",
  "card.recentReceipts": "Recent receipts",
  "card.recentReceipts.sub": "Last six payments entered",
  "card.recentReceipts.emptyTitle": "No receipts yet",
  "card.recentReceipts.emptyBody": "Payments recorded by staff will appear here.",
  "action.viewAll": "View all",
  "action.collect": "Collect",

  /* ---------------------------------------------------------------- tables */
  "th.customer": "Customer",
  "th.due": "Due",
  "th.amount": "Amount",
  "th.status": "Status",
  "th.actions": "Actions",
  "th.received": "Received",
  "th.mode": "Mode",

  /* ------------------------------------------------------------- due dates */
  "due.today": "Due today",
  "due.inDays.one": "Due in {n} day",
  "due.inDays.other": "Due in {n} days",
  "due.lateDays.one": "{n} day overdue",
  "due.lateDays.other": "{n} days overdue",

  /* ----------------------------------------------------------- trend chart */
  "trend.tooShort": "Not enough history yet to show a trend.",
  "trend.up": "up from {amount} in {month}",
  "trend.down": "down from {amount} in {month}",
  "trend.level": "level with {month}",
  "trend.inflow": "inflow",
  "trend.outflow": "outflow",
  "trend.summary":
    "{month}: {collected} collected ({movement}), {disbursed} lent out and {expenses} of costs — a net {direction} of {net}.",
} as const;

export type MessageKey = keyof typeof en;

const mr: Record<MessageKey, string> = {
  "app.tagline": "कर्ज व्यवस्थापन",
  "app.signOut": "साइन आउट",
  "app.openMenu": "मेनू उघडा",
  "app.closeMenu": "मेनू बंद करा",
  "app.themeToLight": "फिकट रंगसंगतीवर जा",
  "app.themeToDark": "गडद रंगसंगतीवर जा",
  "app.themeLight": "फिकट रंगसंगती",
  "app.themeDark": "गडद रंगसंगती",
  "app.language": "भाषा",

  "nav.group.Overview": "आढावा",
  "nav.group.Lending": "कर्जव्यवहार",
  "nav.group.Capital": "भांडवल",
  "nav.group.Business": "व्यवसाय",
  "nav.dashboard": "डॅशबोर्ड",
  "nav.collections": "वसुली",
  "nav.customers": "ग्राहक",
  "nav.loans": "कर्जे",
  "nav.payments": "भरणा",
  "nav.notifications": "स्मरणपत्रे",
  "nav.investors": "गुंतवणूकदार",
  "nav.portfolio": "माझी गुंतवणूक",
  "nav.expenses": "खर्च",
  "nav.reports": "अहवाल",
  "nav.users": "वापरकर्ते व भूमिका",

  "role.ADMIN": "प्रशासक",
  "role.AGENT": "एजंट",
  "role.INVESTOR": "गुंतवणूकदार",

  "greeting.morning": "सुप्रभात",
  "greeting.afternoon": "शुभ दुपार",
  "greeting.evening": "शुभ संध्याकाळ",
  "dashboard.title": "{greeting}, {name}",
  "dashboard.asOn": "{date} रोजीची स्थिती",
  "dashboard.recordPayment": "भरणा नोंदवा",
  "dashboard.newLoan": "नवीन कर्ज",
  "dashboard.keyFigures": "प्रमुख आकडे",

  "tile.outstanding": "येणे बाकी",
  "tile.outstanding.hint": "संपूर्ण खात्यावर अद्याप वसूल करायचे",
  "tile.activeLoans.one": "{n} चालू कर्ज",
  "tile.activeLoans.other": "{n} चालू कर्जे",
  "tile.overdue": "थकीत",
  "tile.overdue.none": "कोणतीही थकबाकी नाही",
  "tile.overdue.hint": "देय तारीख उलटली, भरणा झालेला नाही",
  "tile.overdue.hintNone": "सर्व हप्ते वेळापत्रकानुसार आहेत",
  "tile.overdue.one": "{n} हप्ता वसुलीसाठी बाकी",
  "tile.overdue.other": "{n} हप्ते वसुलीसाठी बाकी",
  "tile.dueWeek": "या आठवड्यात देय",
  "tile.dueWeek.hint": "पुढील ७ दिवसांत देय",
  "tile.dueWeek.one": "{n} हप्ता येऊ घातला आहे",
  "tile.dueWeek.other": "{n} हप्ते येऊ घातले आहेत",
  "tile.cash": "रोख स्थिती",
  "tile.cash.surplus": "शिल्लक आहे",
  "tile.cash.overdrawn": "तूट आहे",
  "tile.cash.hint": "कर्जवाटप, परतावा व खर्च वजा जाता उरलेला गुंतवणूकदार निधी",

  "card.cashMovement": "रोख उलाढाल",
  "card.bookSummary": "खाते सारांश",
  "card.bookSummary.sub": "आजपर्यंतचा संपूर्ण व्यवसाय",
  "book.customers": "ग्राहक",
  "book.principal": "वाटप केलेले मुद्दल",
  "book.collected": "एकूण वसुली",
  "book.investorCapital": "गुंतवणूकदार भांडवल",
  "book.paidBack": "गुंतवणूकदारांना परत",
  "book.expenses": "आजपर्यंतचा खर्च",

  "card.needsCollection": "वसुली बाकी",
  "card.needsCollection.mixed": "{overdue} थकीत, ७ दिवसांत {upcoming} देय",
  "card.needsCollection.clean": "७ दिवसांत {upcoming} देय, थकीत काहीही नाही",
  "card.needsCollection.emptyTitle": "वसुलीसाठी काहीही नाही",
  "card.needsCollection.emptyBody": "या आठवड्यात कोणताही हप्ता थकीत किंवा देय नाही.",
  "card.recentReceipts": "अलीकडील पावत्या",
  "card.recentReceipts.sub": "शेवटचे सहा नोंदवलेले भरणे",
  "card.recentReceipts.emptyTitle": "अद्याप पावत्या नाहीत",
  "card.recentReceipts.emptyBody": "कर्मचाऱ्यांनी नोंदवलेले भरणे इथे दिसतील.",
  "action.viewAll": "सर्व पहा",
  "action.collect": "वसूल करा",

  "th.customer": "ग्राहक",
  "th.due": "देय",
  "th.amount": "रक्कम",
  "th.status": "स्थिती",
  "th.actions": "क्रिया",
  "th.received": "मिळाले",
  "th.mode": "प्रकार",

  "due.today": "आज देय",
  "due.inDays.one": "{n} दिवसात देय",
  "due.inDays.other": "{n} दिवसांत देय",
  "due.lateDays.one": "{n} दिवस थकीत",
  "due.lateDays.other": "{n} दिवस थकीत",

  "trend.tooShort": "कल दाखवण्याइतकी माहिती अद्याप नाही.",
  "trend.up": "{month} मधील {amount} पेक्षा वाढ",
  "trend.down": "{month} मधील {amount} पेक्षा घट",
  "trend.level": "{month} इतकीच",
  "trend.inflow": "आवक",
  "trend.outflow": "जावक",
  "trend.summary":
    "{month}: {collected} वसूल ({movement}), {disbursed} कर्जवाटप आणि {expenses} खर्च — निव्वळ {direction} {net}.",
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { en, mr };

export type Vars = Record<string, string | number>;

/** The interface dictionary as a plain object, safe to pass to client components. */
export function dictionary(locale: Locale): Record<MessageKey, string> {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)),
    template,
  );
}

export type Translate = {
  (key: MessageKey, vars?: Vars): string;
  /** Picks the singular or plural key and passes n through as {n}. */
  plural: (n: number, one: MessageKey, other: MessageKey, vars?: Vars) => string;
  locale: Locale;
};

export function translator(locale: Locale): Translate {
  const dict = dictionary(locale);
  const t = ((key: MessageKey, vars?: Vars) => format(dict[key] ?? en[key], vars)) as Translate;
  t.plural = (n, one, other, vars) => t(n === 1 ? one : other, { n, ...vars });
  t.locale = locale;
  return t;
}
