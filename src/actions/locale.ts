"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";

/**
 * Switches the interface language.
 *
 * No session required: the language is a display preference, not a
 * permission, and the sign-in page should be readable in Marathi too. An
 * unrecognised value falls back to the default rather than being stored.
 */
export async function setLocale(formData: FormData): Promise<void> {
  const requested = formData.get("locale");
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  (await cookies()).set(LOCALE_COOKIE, locale, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Every page carries translated chrome, so the whole tree is stale.
  revalidatePath("/", "layout");
}
