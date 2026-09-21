"use client";

import { useActionState, useRef, useState } from "react";

import type { FormState } from "@/actions/auth";
import { saveUser } from "@/actions/operations";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Field, Input, Note, Select } from "@/components/ui/primitives";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/enums";

export function UserForm({ investors }: { investors: Array<{ id: string; name: string; code: string }> }) {
  const [state, action] = useActionState<FormState, FormData>(saveUser, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<Role>("AGENT");
  const e = state?.errors ?? {};

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
        setRole("AGENT");
      }}
      className="space-y-3.5 p-5"
    >
      <FormError message={e._form} />
      {state?.message ? (
        <p className="tone-chip tone-money rounded-lg px-3 py-2 text-sm font-medium">
          {state.message}
        </p>
      ) : null}

      <Field label="Full name" htmlFor="u-name" error={e.name} required>
        <Input id="u-name" name="name" required />
      </Field>

      <Field label="Email" htmlFor="u-email" error={e.email} required>
        <Input id="u-email" name="email" type="email" autoComplete="off" required />
      </Field>

      <Field label="Role" htmlFor="u-role" error={e.role} required>
        <Select
          id="u-role"
          name="role"
          value={role}
          onChange={(ev) => setRole(ev.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </Field>

      {role === "INVESTOR" ? (
        <Field
          label="Linked investor"
          htmlFor="u-investor"
          error={e.investorId}
          hint="This login will only ever see that investor's own records."
          required
        >
          <Select id="u-investor" name="investorId" defaultValue="">
            <option value="" disabled>
              Select an investor…
            </option>
            {investors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {i.code}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="investorId" value="" />
      )}

      <Field
        label="Initial password"
        htmlFor="u-password"
        error={e.password}
        hint="At least 8 characters. Share it with the user directly and have them change it."
        required
      >
        <Input id="u-password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      {role === "AGENT" ? (
        <Note tone="brand">
          Collection agents can record payments, customers, loans and expenses, but cannot manage
          investors, users or reverse receipts. Scope section 5 item 9 asks whether this role is
          wanted — it is available either way.
        </Note>
      ) : null}

      <SubmitButton size="sm">Create user</SubmitButton>
    </form>
  );
}
