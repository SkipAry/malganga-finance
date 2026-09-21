/**
 * Creates (or re-points) the first administrator on a real deployment.
 *
 * The demo seed is not appropriate for production: it wipes every table and
 * creates logins whose passwords are in the README. This script only inserts
 * one row and never deletes anything.
 *
 *   ADMIN_EMAIL="you@malganga.in" \
 *   ADMIN_NAME="Anil Malganga" \
 *   ADMIN_PASSWORD='<a long unique password>' \
 *   npm run create:admin
 *
 * The password is read from the environment rather than an argument so it does
 * not land in shell history or the process list.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  const problems: string[] = [];
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    problems.push("ADMIN_EMAIL must be a valid email address");
  }
  if (!name || name.length < 2) problems.push("ADMIN_NAME is required");
  if (!password || password.length < 12) {
    problems.push("ADMIN_PASSWORD must be at least 12 characters");
  }
  if (problems.length) {
    console.error(`\nCannot create administrator:\n  - ${problems.join("\n  - ")}\n`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password as string, 12);

  const user = await db.user.upsert({
    where: { email: email as string },
    update: { passwordHash, name: name as string, role: "ADMIN", isActive: true },
    create: { email: email as string, name: name as string, passwordHash, role: "ADMIN" },
  });

  await db.auditLog.create({
    data: { userId: user.id, action: "BOOTSTRAP_ADMIN", entity: "User", entityId: user.id },
  });

  const total = await db.user.count();
  console.log(`\nAdministrator ready: ${user.email}`);
  console.log(`${total} user account(s) exist. Sign in and change the password.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
