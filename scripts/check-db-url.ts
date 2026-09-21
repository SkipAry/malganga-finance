/**
 * Diagnoses DATABASE_URL / DIRECT_URL without ever printing the password.
 *
 *   npm run db:check
 *
 * Connection strings are easy to get subtly wrong — a stray quote, a trailing
 * newline from a two-line paste, an unescaped '#' that silently truncates the
 * password — and the resulting errors point at the schema rather than the
 * value. This reports exactly which of those is present, then tries a real
 * connection so the string can be proven good before it goes near a host.
 */
import { PrismaClient } from "@prisma/client";

type Check = { ok: boolean; label: string; detail?: string };

function inspect(name: string, raw: string | undefined): Check[] {
  const checks: Check[] = [];
  const push = (ok: boolean, label: string, detail?: string) =>
    checks.push({ ok, label, detail });

  if (!raw) {
    push(false, `${name} is set`, "not found in the environment");
    return checks;
  }

  push(true, `${name} is set`, `${raw.length} characters`);

  const trimmed = raw.trim();
  push(raw === trimmed, "no leading/trailing whitespace",
    raw === trimmed ? undefined : "trim it — Prisma does not");

  push(!/[\r\n]/.test(raw), "single line",
    /[\r\n]/.test(raw) ? "contains a line break: two strings pasted into one field?" : undefined);

  push(!/^["']|["']$/.test(trimmed), "not wrapped in quotes",
    /^["']|["']$/.test(trimmed) ? "remove the surrounding quotes" : undefined);

  push(!/[\[\]]/.test(trimmed), "no square brackets",
    /[\[\]]/.test(trimmed) ? "[...] placeholder markers are still in the value" : undefined);

  const protocolOk = /^postgres(ql)?:\/\//.test(trimmed);
  push(protocolOk, "starts with postgresql://",
    protocolOk ? undefined : `starts with "${trimmed.slice(0, 12)}…"`);

  if (protocolOk) {
    // A raw '#' opens a URL fragment mid-authority, so what follows the
    // password is read as a port and parsing fails outright. Check it before
    // parsing — inside the try it would only run in the case it cannot occur.
    const credentials = trimmed
      .slice(trimmed.indexOf("://") + 3)
      .split("@")
      .slice(0, -1)
      .join("@");
    const rawHash = credentials.includes("#");
    push(!rawHash, "no unescaped '#' in credentials",
      rawHash ? "write '#' as %23 — a raw one breaks the whole URL" : undefined);

    try {
      const u = new URL(trimmed);
      push(true, "parses as a URL", `host ${u.hostname}, port ${u.port || "(default)"}`);
      push(u.password.length > 0, "password present",
        u.password.length > 0 ? `${u.password.length} characters` : "empty");

      const expectedPort = name === "DATABASE_URL" ? "6543" : "5432";
      push(u.port === expectedPort, `port is ${expectedPort}`,
        u.port === expectedPort ? undefined : `found ${u.port || "none"}`);

      if (name === "DATABASE_URL") {
        push(u.searchParams.get("pgbouncer") === "true", "pgbouncer=true present");
      }
    } catch (err) {
      push(false, "parses as a URL", (err as Error).message);
    }
  }

  return checks;
}

function report(name: string, checks: Check[]): boolean {
  console.log(`\n${name}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "ok  " : "FAIL"}  ${c.label}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  return checks.every((c) => c.ok);
}

async function main() {
  const appOk = report("DATABASE_URL (pooled, used by the app)", inspect("DATABASE_URL", process.env.DATABASE_URL));
  const migrateOk = report("DIRECT_URL (direct, used by migrations)", inspect("DIRECT_URL", process.env.DIRECT_URL));

  const secret = process.env.AUTH_SECRET ?? "";
  const secretOk = secret.length >= 32;
  console.log("\nAUTH_SECRET");
  console.log(`  ${secretOk ? "ok  " : "FAIL"}  at least 32 characters — ${secret.length} found`);

  if (!appOk) {
    console.log("\nFix DATABASE_URL above before trying to connect.\n");
    process.exit(1);
  }

  console.log("\nConnecting…");
  const db = new PrismaClient();
  try {
    const users = await db.user.count();
    const customers = await db.customer.count();
    console.log(`  ok    connected. ${users} user(s), ${customers} customer(s).`);
    if (users === 0) console.log("        no users yet — run: npm run create:admin");
  } catch (err) {
    console.log(`  FAIL  ${(err as Error).message.split("\n")[0]}`);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
  console.log(`\n${appOk && migrateOk && secretOk ? "All checks passed." : "Some checks failed — see above."}\n`);
}

main();
