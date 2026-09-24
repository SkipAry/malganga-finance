import { AppShell } from "@/components/app-shell";
import { getLocale } from "@/lib/locale";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, locale] = await Promise.all([requireUser(), getLocale()]);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} locale={locale}>
      {children}
    </AppShell>
  );
}
