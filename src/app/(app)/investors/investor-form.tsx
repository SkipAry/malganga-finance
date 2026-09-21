"use client";

import { useActionState, useRef } from "react";

import type { FormState } from "@/actions/auth";
import { addInvestorTxn, saveInvestor } from "@/actions/investors";
import { FormError, SubmitButton } from "@/components/form-parts";
import {
  Card,
  CardHeader,
  Field,
  Input,
  LinkButton,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { toInputDate } from "@/lib/dates";
import { INVESTOR_TXN_LABEL, INVESTOR_TXN_TYPES, INVESTOR_TYPES } from "@/lib/enums";

export type InvestorFormValues = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  type?: string;
  interestRatePct?: number;
  address?: string | null;
};

export function InvestorForm({ values = {} }: { values?: InvestorFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveInvestor, null);
  const e = state?.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={e._form} />

      <Card>
        <CardHeader
          title="Investor"
          subtitle="Internal and external investors may be offered different rates."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={e.name} required>
            <Input id="name" name="name" defaultValue={values.name ?? ""} required autoFocus />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={e.phone} required>
            <Input id="phone" name="phone" inputMode="tel" defaultValue={values.phone ?? ""} required />
          </Field>
          <Field label="Email" htmlFor="email" error={e.email}>
            <Input id="email" name="email" type="email" defaultValue={values.email ?? ""} />
          </Field>
          <Field label="Category" htmlFor="type" error={e.type} required>
            <Select id="type" name="type" defaultValue={values.type ?? "EXTERNAL"}>
              {INVESTOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "INTERNAL" ? "Internal" : "External"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Agreed interest rate (% per month)"
            htmlFor="interestRatePct"
            error={e.interestRatePct}
            required
          >
            <Input
              id="interestRatePct"
              name="interestRatePct"
              type="number"
              step="0.01"
              min="0"
              defaultValue={values.interestRatePct ?? 2}
              required
            />
          </Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2">
            <Textarea id="address" name="address" rows={2} defaultValue={values.address ?? ""} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <LinkButton href={values.id ? `/investors/${values.id}` : "/investors"}>Cancel</LinkButton>
        <SubmitButton>{values.id ? "Save changes" : "Add investor"}</SubmitButton>
      </div>
    </form>
  );
}

/** Capital in, withdrawals and interest payouts for one investor. */
export function InvestorTxnForm({ investorId }: { investorId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addInvestorTxn, null);
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
      <input type="hidden" name="investorId" value={investorId} />
      <FormError message={e._form} />
      {state?.message ? (
        <p className="rounded-lg bg-money-100 px-3 py-2 text-[12.5px] font-medium text-money-600">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Type" htmlFor="txn-type" error={e.type} required>
          <Select id="txn-type" name="type" defaultValue="INVESTMENT">
            {INVESTOR_TXN_TYPES.map((t) => (
              <option key={t} value={t}>
                {INVESTOR_TXN_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount" htmlFor="txn-amount" error={e.amount} required>
          <Input id="txn-amount" name="amount" inputMode="decimal" required />
        </Field>
        <Field label="Date" htmlFor="txn-date" error={e.date} required>
          <Input id="txn-date" name="date" type="date" defaultValue={toInputDate(new Date())} required />
        </Field>
        <Field label="Mode" htmlFor="txn-mode" error={e.mode} required>
          <Select id="txn-mode" name="mode" defaultValue="ONLINE">
            <option value="ONLINE">Online</option>
            <option value="CASH">Cash</option>
          </Select>
        </Field>
      </div>

      <Field label="Note" htmlFor="txn-note">
        <Input id="txn-note" name="note" />
      </Field>

      <SubmitButton size="sm">Record transaction</SubmitButton>
    </form>
  );
}
