import type { Role } from "@/lib/enums";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles: Role[];
  group: "Overview" | "Lending" | "Capital" | "Business";
};

/**
 * Single source of navigation truth, filtered by role.
 * Icons are inline SVG path data (see `NavIcon`) - no icon dependency.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", roles: ["ADMIN", "AGENT"], group: "Overview" },
  { href: "/collections", label: "Collections", icon: "inbox", roles: ["ADMIN", "AGENT"], group: "Overview" },

  { href: "/customers", label: "Customers", icon: "users", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/loans", label: "Loans", icon: "file", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/payments", label: "Payments", icon: "rupee", roles: ["ADMIN", "AGENT"], group: "Lending" },
  { href: "/notifications", label: "Reminders", icon: "bell", roles: ["ADMIN", "AGENT"], group: "Lending" },

  { href: "/investors", label: "Investors", icon: "trending", roles: ["ADMIN"], group: "Capital" },
  { href: "/portfolio", label: "My portfolio", icon: "trending", roles: ["INVESTOR"], group: "Capital" },

  { href: "/expenses", label: "Expenses", icon: "wallet", roles: ["ADMIN", "AGENT"], group: "Business" },
  { href: "/reports", label: "Reports", icon: "chart", roles: ["ADMIN"], group: "Business" },
  { href: "/users", label: "Users & roles", icon: "shield", roles: ["ADMIN"], group: "Business" },
];

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
