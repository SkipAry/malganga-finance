"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { createSession, destroySession, recordAudit } from "@/lib/session";
import { fieldErrors, loginSchema } from "@/lib/validators";
import type { Role } from "@/lib/enums";

export type FormState = { errors?: Record<string, string>; message?: string } | null;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Same message and a hash comparison either way, so a wrong email and a wrong
  // password are indistinguishable in both response body and timing.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await bcrypt.compare(parsed.data.password, hash);

  if (!user || !ok || !user.isActive) {
    return { errors: { _form: "Incorrect email or password." } };
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    investorId: user.investorId,
  });
  await recordAudit(user.id, "LOGIN", "User", user.id);

  redirect(user.role === "INVESTOR" ? "/portfolio" : "/dashboard");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
