"use client";

import { useState } from "react";

import { PaymentForm, type InstallmentOption } from "@/components/payment-form";
import { Badge, Card, CardHeader, Field, Select } from "@/components/ui/primitives";

type LoanOption = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  overdue: boolean;
  installments: InstallmentOption[];
};

/** Pick the loan first, then the receipt form re-keys so its defaults reset. */
export function LoanPicker({
  loans,
  defaultLoanId,
}: {
  loans: LoanOption[];
  defaultLoanId?: string;
}) {
  const initial = loans.find((l) => l.id === defaultLoanId) ?? loans[0];
  const [loanId, setLoanId] = useState(initial.id);
  const loan = loans.find((l) => l.id === loanId) ?? initial;

  return (
    <Card>
      <CardHeader
        title="Receipt details"
        subtitle={`${loan.customerName} · ${loan.customerPhone}`}
        action={loan.overdue ? <Badge tone="risk">Overdue</Badge> : null}
      />
      <div className="border-b p-5">
        <Field label="Loan" htmlFor="loan-picker" required>
          <Select id="loan-picker" value={loanId} onChange={(ev) => setLoanId(ev.target.value)}>
            {loans.map((l) => (
              <option key={l.id} value={l.id}>
                {l.customerName} · {l.code}
                {l.overdue ? " · overdue" : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <PaymentForm key={loan.id} loanId={loan.id} installments={loan.installments} compact />
    </Card>
  );
}
