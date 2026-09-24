/**
 * Which language the current request renders in.
 *
 * A cookie rather than a /[locale]/ route segment: every page here is already
 * server-rendered per request behind a session cookie, so there is nothing to
 * cache per-URL and nothing to gain from putting the language in the path.
 * The cost is that a link cannot carry a language — acceptable for an
 * internal tool where staff set it once on their own phone.
 */
import { cookies } from "next/headers";

import { DEFAULT_LOCALE, isLocale, translator, type Locale, type Translate } from "./i18n";

export const LOCALE_COOKIE = "mg-locale";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Convenience for server components: `const t = await getTranslate();` */
export async function getTranslate(): Promise<Translate> {
  return translator(await getLocale());
}
