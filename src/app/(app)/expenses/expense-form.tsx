"use client";

import { useActionState, useRef } from "react";

import type { FormState } from "@/actions/auth";
import { saveExpense } from "@/actions/operations";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { toInputDate } from "@/lib/dates";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/enums";

export function ExpenseForm() {
  const [state, action] = useActionState<FormState, FormData>(saveExpense, null);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="space-y-3.5 p-5"
    >
      <FormError message={e._form} />
      {state?.message ? (
        <p className="rounded-lg bg-money-100 px-3 py-2 text-[12.5px] font-medium text-money-600">
          {state.message}
        </p>
      ) : null}

      <Field label="Category" htmlFor="category" error={e.category} required>
        <Select id="category" name="category" defaultValue="DAILY">
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Amount" htmlFor="amount" error={e.amount} required>
          <Input id="amount" name="amount" inputMode="decimal" required />
        </Field>
        <Field label="Date" htmlFor="date" error={e.date} required>
          <Input id="date" name="date" type="date" defaultValue={toInputDate(new Date())} required />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" error={e.description} required>
        <Textarea id="description" name="description" rows={2} required />
      </Field>

      <Field label="Paid by" htmlFor="mode" error={e.mode} required>
        <Select id="mode" name="mode" defaultValue="CASH">
          <option value="CASH">Cash</option>
          <option value="ONLINE">Online</option>
        </Select>
      </Field>

      <SubmitButton size="sm">Record expense</SubmitButton>
    </form>
  );
}
