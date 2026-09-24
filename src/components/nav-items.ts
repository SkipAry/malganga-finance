import type { Role } from "@/lib/enums";
import type { MessageKey } from "@/lib/i18n";

export type NavItem = {
  href: string;
  /** Dictionary key; the shell resolves it in the active language. */
  labelKey: MessageKey;
  icon: string;
  roles: Role[];
  group: "Overview" | "Lending" | "Capital" | "Business";
};

/**
 * Single source of navigation truth, filtered by role.
 * Icons are inline SVG path data (see `NavIcon`) - no icon dependency.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: "grid", roles: ["ADMIN", "AGENT"], group: "Overview" },
  { href: "/collections", labelKey: "nav.collections", icon: "inbox", roles: ["ADMIN", "AGENT"], group: "Overview" },

  { href: "/customers", labelKey: "nav.customers", icon: "users", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/loans", labelKey: "nav.loans", icon: "file", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/payments", labelKey: "nav.payments", icon: "rupee", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/notifications", labelKey: "nav.notifications", icon: "bell", roles: ["ADMIN", "AGENT"], group: "Lending" },

  { href: "/investors", labelKey: "nav.investors", icon: "trending", roles: ["ADMIN"], group: "Capital" },
  { href: "/portfolio", labelKey: "nav.portfolio", icon: "trending", roles: ["INVESTOR"], group: "Capital" },

  { href: "/expenses", labelKey: "nav.expenses", icon: "wallet", roles: ["ADMIN", "AGENT"], group: "Business" },
  { href: "/reports", labelKey: "nav.reports", icon: "chart", roles: ["ADMIN"], group: "Business" },
  { href: "/users", labelKey: "nav.users", icon: "shield", roles: ["ADMIN"], group: "Business" },
];

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
