"use client";

import { useActionState } from "react";

import { login, type FormState } from "@/actions/auth";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Field, Input } from "@/components/ui/primitives";

export function LoginForm() {
  const [state, action] = useActionState<FormState, FormData>(login, null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.errors?._form} />

      <Field label="Email address" htmlFor="email" error={state?.errors?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@malganga.in"
          required
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state?.errors?.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
