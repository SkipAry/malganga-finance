"use client";

import { useActionState, useRef, useState } from "react";

import type { FormState } from "@/actions/auth";
import { recordPayment } from "@/actions/loans";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Field, Input, Select } from "@/components/ui/primitives";
import { formatDate, toInputDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export type InstallmentOption = {
  id: string;
  seq: number;
  dueDate: Date;
  owedPaise: number;
};

/**
 * Manual receipt entry (scope 4.4). Picking an installment pre-fills the exact
 * amount owed, which is what staff enter nine times out of ten.
 */
export function PaymentForm({
  loanId,
  installments,
  compact = false,
}: {
  loanId: string;
  installments: InstallmentOption[];
  compact?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(recordPayment, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState(
    installments[0] ? String(installments[0].owedPaise / 100) : "",
  );
  const e = state?.errors ?? {};

  function onInstallmentChange(id: string) {
    const match = installments.find((i) => i.id === id);
    if (match) setAmount(String(match.owedPaise / 100));
  }

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
      }}
      className={compact ? "space-y-3.5 p-5" : "space-y-4"}
    >
      <input type="hidden" name="loanId" value={loanId} />
      <FormError message={e._form} />
      {state?.message ? (
        <p className="tone-chip tone-money rounded-lg px-3 py-2 text-[12.5px] font-medium">
          {state.message}
        </p>
      ) : null}

      <Field
        label="Apply to installment"
        htmlFor="installmentId"
        error={e.installmentId}
        hint="Any surplus rolls on to the next unpaid EMI."
      >
        <Select
          id="installmentId"
          name="installmentId"
          defaultValue={installments[0]?.id ?? ""}
          onChange={(ev) => onInstallmentChange(ev.target.value)}
        >
          <option value="">Oldest unpaid first</option>
          {installments.map((i) => (
            <option key={i.id} value={i.id}>
              EMI {i.seq} · due {formatDate(i.dueDate)} · {formatMoney(i.owedPaise)}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Amount received" htmlFor="amount" error={e.amount} required>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            required
          />
        </Field>
        <Field label="Received on" htmlFor="receivedOn" error={e.receivedOn} required>
          <Input
            id="receivedOn"
            name="receivedOn"
            type="date"
            defaultValue={toInputDate(new Date())}
            required
          />
        </Field>
        <Field label="Mode" htmlFor="mode" error={e.mode} required>
          <Select id="mode" name="mode" defaultValue="CASH">
            <option value="CASH">Cash</option>
            <option value="ONLINE">Online</option>
          </Select>
        </Field>
        <Field label="Reference" htmlFor="reference" hint="UTR, cheque no. or receipt book no.">
          <Input id="reference" name="reference" />
        </Field>
      </div>

      <SubmitButton size={compact ? "sm" : "md"} pendingLabel="Recording…">
        Record receipt
      </SubmitButton>
    </form>
  );
}
