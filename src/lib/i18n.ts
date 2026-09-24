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


  /* ------------------------------------------------------------ enum labels */
  "role.ADMIN": "Administrator",
  "role.AGENT": "Collection Agent",
  "role.INVESTOR": "Investor",

  "loanStatus.ACTIVE": "Active",
  "loanStatus.CLOSED": "Closed",
  "loanStatus.DEFAULTED": "Defaulted",

  "installmentStatus.PENDING": "Pending",
  "installmentStatus.PARTIAL": "Part paid",
  "installmentStatus.PAID": "Paid",
  "installmentStatus.WAIVED": "Waived",
  "installmentStatus.overdue": "Overdue",
  "installmentStatus.partialOverdue": "Part paid \u00b7 overdue",

  "mode.CASH": "Cash",
  "mode.ONLINE": "Online",

  "investorType.INTERNAL": "Internal",
  "investorType.EXTERNAL": "External",

  "investorTxn.INVESTMENT": "Investment in",
  "investorTxn.WITHDRAWAL": "Withdrawal",
  "investorTxn.INTEREST_PAYOUT": "Interest payout",

  "frequency.WEEKLY": "Weekly",
  "frequency.MONTHLY": "Monthly",

  "loanStructure.FLAT_UPFRONT": "Flat (first EMI upfront)",
  "loanStructure.INTEREST_ONLY": "Interest only",
  "loanStructure.INTEREST_PRINCIPAL": "Interest + Principal",

  "expenseCategory.DAILY": "Daily expense",
  "expenseCategory.TRANSPORT": "Transport",
  "expenseCategory.MONTHLY": "Monthly expense",
  "expenseCategory.ACCOUNTING": "Accounting",
  "expenseCategory.MAINTENANCE": "Maintenance",

  "documentKind.AADHAAR": "Aadhaar",
  "documentKind.PAN": "PAN card",
  "documentKind.VOTER_ID": "Voter ID",
  "documentKind.DRIVING_LICENCE": "Driving licence",
  "documentKind.PASSPORT": "Passport",
  "documentKind.SHOP_ACT": "Shop Act licence",
  "documentKind.PHOTO_CUSTOMER": "Customer photograph",
  "documentKind.PHOTO_SHOP": "Shop photograph",
  "documentKind.PHOTO_COLLATERAL": "Collateral photograph",
  "documentKind.OTHER": "Other document",

  "assetType.GOLD": "Gold / jewellery",
  "assetType.VEHICLE": "Vehicle",
  "assetType.PROPERTY": "Property",
  "assetType.MACHINERY": "Machinery",
  "assetType.STOCK": "Shop stock",
  "assetType.OTHER": "Other",

  "notificationKind.BEFORE_DUE": "Day-before reminder",
  "notificationKind.ON_DUE": "Due-date reminder",
  "notificationKind.OVERDUE": "Overdue reminder",

  "notificationStatus.PENDING": "Queued",
  "notificationStatus.SENT": "Sent",
  "notificationStatus.FAILED": "Failed",
  "notificationStatus.CANCELLED": "Cancelled",

  "upfrontMode.NONE": "No upfront deduction",
  "upfrontMode.EXTRA_CHARGE": "Deduct one EMI as an upfront charge",

  /* -------------------------------------------------------- common actions */
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.saving": "Saving\u2026",
  "common.working": "Working\u2026",
  "common.search": "Search",
  "common.all": "All",
  "common.new": "New",
  "common.back": "Back",
  "common.print": "Print",
  "common.total": "Total",
  "common.none": "None",
  "common.yes": "Yes",
  "common.no": "No",

  "collections.title": "Collections",
  "collections.sub": "Everything overdue, plus what falls due next — worked oldest first.",
  "collections.overdueOnly": "Overdue only",
  "collections.days7": "7 days",
  "collections.days30": "30 days",
  "collections.dueInDays": "Due in {n} days",
  "collections.totalToCollect": "Total to collect",
  "collections.worklist": "Worklist",
  "collections.emptyTitle": "All clear",
  "collections.emptyBody": "Nothing is overdue and nothing falls due in this window.",
  "emi.count.one": "{n} EMI",
  "emi.count.other": "{n} EMIs",
  "installment.count.one": "{n} installment",
  "installment.count.other": "{n} installments",
  "th.contact": "Contact",
  "th.loan": "Loan",
  "emi.seq": "EMI {n}",

  "payments.title": "Payments",
  "payments.sub": "Every receipt is entered by hand — there is no bank or gateway feed.",
  "payments.collectedMonth": "Collected this month",
  "payments.receipts.one": "{n} receipt",
  "payments.receipts.other": "{n} receipts",
  "payments.inCash": "In cash",
  "payments.online": "Online",
  "payments.search": "Search customer, loan code or reference…",
  "payments.noMatch": "No matching receipts",
  "payments.noneTitle": "No payments recorded",
  "payments.trySearch": "Try another search.",
  "payments.noneBody": "Record a collection to see it here.",
  "payments.reverse": "Reverse",
  "payments.reverseConfirm": "Reverse this receipt of {amount}?",
  "th.reference": "Reference",
  "th.recordedBy": "Recorded by",

  "expenses.title": "Expenses",
  "expenses.sub": "Day-to-day running costs of the business",
  "expenses.thisMonth": "This month",
  "expenses.thisYear": "This year",
  "expenses.entries.one": "{n} entry",
  "expenses.entries.other": "{n} entries",
  "expenses.largestCategory": "Largest category",
  "expenses.emptyTitle": "No expenses recorded",
  "expenses.emptyBody": "Log the first expense on the right.",
  "expenses.record": "Record an expense",
  "expenses.byCategory": "This month by category",
  "expenses.nothingThisMonth": "Nothing recorded this month.",
  "expenses.approvalsTitle": "Approvals",
  "expenses.approvalsBody": "Expenses post straight to the ledger. Whether an approval step is needed is still open.",
  "expenses.deleteConfirm": "Delete this expense?",
  "th.date": "Date",
  "th.category": "Category",
  "th.description": "Description",
  "th.by": "By",

  "loans.title": "Loans",
  "loans.count.one": "{n} loan",
  "loans.count.other": "{n} loans",
  "loans.search": "Search loan code, customer or phone…",
  "loans.noMatch": "No matching loans",
  "loans.noneTitle": "No loans here",
  "loans.noneBody": "Disburse a loan to see it listed.",
  "loans.terms": "{n} × {frequency}",
  "loans.ratePerMonth": "{rate}% / month",
  "loans.pctRepaid": "{pct}% repaid",
  "frequency.weekly.lower": "weekly",
  "frequency.monthly.lower": "monthly",
  "th.terms": "Terms",
  "th.disbursed": "Disbursed",
  "th.outstanding": "Outstanding",
  "th.repayment": "Repayment",

  "customers.title": "Customers",
  "customers.count.one": "{n} record",
  "customers.count.other": "{n} records",
  "customers.add": "Add customer",
  "customers.search": "Search name, phone, code or shop…",
  "customers.active": "Active",
  "customers.inactive": "Inactive",
  "customers.noMatch": "No matching customers",
  "customers.noneTitle": "No customers yet",
  "customers.noMatchBody": "Try a different name, phone number or code.",
  "customers.noneBody": "Onboard your first borrower to get started.",
  "customers.activeLoans": "{n} active",
  "th.loans": "Loans",
  "th.onboarded": "Onboarded",

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
  "customers.title": "ग्राहक",
  "customers.count.one": "{n} नोंद",
  "customers.count.other": "{n} नोंदी",
  "customers.add": "ग्राहक जोडा",
  "customers.search": "नाव, फोन, क्रमांक किंवा दुकान शोधा…",
  "customers.active": "चालू",
  "customers.inactive": "बंद",
  "customers.noMatch": "जुळणारे ग्राहक नाहीत",
  "customers.noneTitle": "अद्याप ग्राहक नाहीत",
  "customers.noMatchBody": "दुसरे नाव, फोन क्रमांक किंवा क्रमांक वापरून पहा.",
  "customers.noneBody": "सुरुवात करण्यासाठी पहिला कर्जदार नोंदवा.",
  "customers.activeLoans": "{n} चालू",
  "th.loans": "कर्जे",
  "th.onboarded": "नोंदणी",
  "loans.title": "कर्जे",
  "loans.count.one": "{n} कर्ज",
  "loans.count.other": "{n} कर्जे",
  "loans.search": "कर्ज क्रमांक, ग्राहक किंवा फोन शोधा…",
  "loans.noMatch": "जुळणारी कर्जे नाहीत",
  "loans.noneTitle": "येथे कोणतेही कर्ज नाही",
  "loans.noneBody": "कर्ज वाटप करा म्हणजे ते यादीत दिसेल.",
  "loans.terms": "{n} × {frequency}",
  "loans.ratePerMonth": "{rate}% / महिना",
  "loans.pctRepaid": "{pct}% परतफेड",
  "frequency.weekly.lower": "साप्ताहिक",
  "frequency.monthly.lower": "मासिक",
  "th.terms": "अटी",
  "th.disbursed": "वाटप",
  "th.outstanding": "येणे बाकी",
  "th.repayment": "परतफेड",
  "expenses.title": "खर्च",
  "expenses.sub": "व्यवसायाचा दैनंदिन चालू खर्च",
  "expenses.thisMonth": "या महिन्यात",
  "expenses.thisYear": "या वर्षात",
  "expenses.entries.one": "{n} नोंद",
  "expenses.entries.other": "{n} नोंदी",
  "expenses.largestCategory": "सर्वात मोठा प्रकार",
  "expenses.emptyTitle": "कोणताही खर्च नोंदवलेला नाही",
  "expenses.emptyBody": "उजवीकडे पहिला खर्च नोंदवा.",
  "expenses.record": "खर्च नोंदवा",
  "expenses.byCategory": "या महिन्याचा प्रकारनिहाय खर्च",
  "expenses.nothingThisMonth": "या महिन्यात काहीही नोंदवलेले नाही.",
  "expenses.approvalsTitle": "मंजुरी",
  "expenses.approvalsBody": "खर्च थेट खातेवहीत नोंदवले जातात. मंजुरीची पायरी हवी का, हे अद्याप ठरलेले नाही.",
  "expenses.deleteConfirm": "हा खर्च हटवायचा?",
  "th.date": "दिनांक",
  "th.category": "प्रकार",
  "th.description": "तपशील",
  "th.by": "कोणी",
  "payments.title": "भरणा",
  "payments.sub": "प्रत्येक पावती हाताने नोंदवली जाते — बँक किंवा गेटवे जोडणी नाही.",
  "payments.collectedMonth": "या महिन्यातील वसुली",
  "payments.receipts.one": "{n} पावती",
  "payments.receipts.other": "{n} पावत्या",
  "payments.inCash": "रोखीने",
  "payments.online": "ऑनलाइन",
  "payments.search": "ग्राहक, कर्ज क्रमांक किंवा संदर्भ शोधा…",
  "payments.noMatch": "जुळणाऱ्या पावत्या नाहीत",
  "payments.noneTitle": "कोणताही भरणा नोंदवलेला नाही",
  "payments.trySearch": "दुसरा शोध करून पहा.",
  "payments.noneBody": "वसुली नोंदवा म्हणजे ती इथे दिसेल.",
  "payments.reverse": "उलट करा",
  "payments.reverseConfirm": "{amount} ची ही पावती उलट करायची?",
  "th.reference": "संदर्भ",
  "th.recordedBy": "नोंदवणारे",
  "collections.title": "वसुली",
  "collections.sub": "सर्व थकीत, तसेच पुढे देय होणारे — सर्वात जुने आधी.",
  "collections.overdueOnly": "फक्त थकीत",
  "collections.days7": "७ दिवस",
  "collections.days30": "३० दिवस",
  "collections.dueInDays": "{n} दिवसांत देय",
  "collections.totalToCollect": "एकूण वसूल करायचे",
  "collections.worklist": "कामाची यादी",
  "collections.emptyTitle": "सर्व स्वच्छ",
  "collections.emptyBody": "या कालावधीत काहीही थकीत नाही आणि काहीही देय नाही.",
  "emi.count.one": "{n} हप्ता",
  "emi.count.other": "{n} हप्ते",
  "installment.count.one": "{n} हप्ता",
  "installment.count.other": "{n} हप्ते",
  "th.contact": "संपर्क",
  "th.loan": "कर्ज",
  "emi.seq": "हप्ता {n}",
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
  "role.AGENT": "वसुली एजंट",
  "role.INVESTOR": "गुंतवणूकदार",

  "loanStatus.ACTIVE": "चालू",
  "loanStatus.CLOSED": "बंद",
  "loanStatus.DEFAULTED": "थकबाकीदार",

  "installmentStatus.PENDING": "बाकी",
  "installmentStatus.PARTIAL": "अंशतः भरले",
  "installmentStatus.PAID": "भरले",
  "installmentStatus.WAIVED": "माफ",
  "installmentStatus.overdue": "थकीत",
  "installmentStatus.partialOverdue": "अंशतः भरले · थकीत",

  "mode.CASH": "रोख",
  "mode.ONLINE": "ऑनलाईन",

  "investorType.INTERNAL": "अंतर्गत",
  "investorType.EXTERNAL": "बाहेरील",

  "investorTxn.INVESTMENT": "गुंतवणूक",
  "investorTxn.WITHDRAWAL": "परत काढले",
  "investorTxn.INTEREST_PAYOUT": "व्याज परतावा",

  "frequency.WEEKLY": "साप्ताहिक",
  "frequency.MONTHLY": "मासिक",

  "loanStructure.FLAT_UPFRONT": "सपाट (पहिला हप्ता आगाउ)",
  "loanStructure.INTEREST_ONLY": "फक्त व्याज",
  "loanStructure.INTEREST_PRINCIPAL": "व्याज + मुद्दल",

  "expenseCategory.DAILY": "दैनंदिन खर्च",
  "expenseCategory.TRANSPORT": "प्रवास",
  "expenseCategory.MONTHLY": "मासिक खर्च",
  "expenseCategory.ACCOUNTING": "लेखा",
  "expenseCategory.MAINTENANCE": "देखभाल",

  "documentKind.AADHAAR": "आधार",
  "documentKind.PAN": "पॅन कार्ड",
  "documentKind.VOTER_ID": "मतदार ओळखपत्र",
  "documentKind.DRIVING_LICENCE": "वाहन परवाना",
  "documentKind.PASSPORT": "पासपोर्ट",
  "documentKind.SHOP_ACT": "शॉप অॅक्ट परवाना",
  "documentKind.PHOTO_CUSTOMER": "ग्राहक फोटो",
  "documentKind.PHOTO_SHOP": "दुकान फोटो",
  "documentKind.PHOTO_COLLATERAL": "तारण फोटो",
  "documentKind.OTHER": "इतर कागदपत्र",

  "assetType.GOLD": "सोने / दागिने",
  "assetType.VEHICLE": "वाहन",
  "assetType.PROPERTY": "मिळकत",
  "assetType.MACHINERY": "यंत्रसामग्री",
  "assetType.STOCK": "दुकानातील माल",
  "assetType.OTHER": "इतर",

  "notificationKind.BEFORE_DUE": "एक दिवस आधीचे स्मरणपत्र",
  "notificationKind.ON_DUE": "देय दिवशाचे स्मरणपत्र",
  "notificationKind.OVERDUE": "थकीत स्मरणपत्र",

  "notificationStatus.PENDING": "रांगेत",
  "notificationStatus.SENT": "पाठवले",
  "notificationStatus.FAILED": "अयशस्वी",
  "notificationStatus.CANCELLED": "रद्द",

  "upfrontMode.NONE": "आगाउ कपात नाही",
  "upfrontMode.EXTRA_CHARGE": "एक हप्ता आगाउ शुल्क म्हणून कपात",

  "common.edit": "संपादन",
  "common.delete": "हटवा",
  "common.cancel": "रद्द करा",
  "common.save": "जतन करा",
  "common.saving": "जतन होत आहे…",
  "common.working": "सुरू आहे…",
  "common.search": "शोधा",
  "common.all": "सर्व",
  "common.new": "नवीन",
  "common.back": "मागे",
  "common.print": "प्रिंट",
  "common.total": "एकूण",
  "common.none": "काही नाही",
  "common.yes": "होय",
  "common.no": "नाही",

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
