"use client";

import { useActionState, useMemo, useState } from "react";

import type { FormState } from "@/actions/auth";
import { createLoan } from "@/actions/loans";
import { FormError, SubmitButton } from "@/components/form-parts";
import {
  Card,
  CardHeader,
  Field,
  Input,
  LinkButton,
  Note,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { addDays, addMonths, formatDate, toInputDate } from "@/lib/dates";
import { buildSchedule, disbursementOf } from "@/lib/emi";
import {
  LOAN_FREQUENCIES,
  LOAN_STRUCTURES,
  LOAN_STRUCTURE_HINT,
  LOAN_STRUCTURE_LABEL,
  UPFRONT_MODES,
  UPFRONT_MODE_HINT,
  UPFRONT_MODE_LABEL,
  type LoanFrequency,
  type LoanStructure,
  type UpfrontMode,
} from "@/lib/enums";
import { formatMoney, toPaise } from "@/lib/money";

type CustomerOption = { id: string; name: string; code: string; phone: string };

const today = new Date();

export function LoanForm({
  customers,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  defaultCustomerId?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(createLoan, null);
  const e = state?.errors ?? {};

  // Mirrored locally so the schedule preview updates as the terms are typed.
  const [principal, setPrincipal] = useState("100000");
  const [rate, setRate] = useState("3");
  const [tenure, setTenure] = useState("14");
  const [frequency, setFrequency] = useState<LoanFrequency>("WEEKLY");
  const [structure, setStructure] = useState<LoanStructure>("FLAT_UPFRONT");
  const [upfrontMode, setUpfrontMode] = useState<UpfrontMode>("EXTRA_CHARGE");
  const [disbursedOn, setDisbursedOn] = useState(toInputDate(today));
  const [firstEmiOn, setFirstEmiOn] = useState(toInputDate(addDays(today, 7)));

  const preview = useMemo(() => {
    try {
      const principalPaise = toPaise(principal || "0");
      const n = Number(tenure);
      if (principalPaise <= 0 || !Number.isInteger(n) || n < 1) return null;

      const schedule = buildSchedule({
        principalPaise,
        interestRatePct: Number(rate) || 0,
        tenure: n,
        frequency,
        structure,
        firstEmiOn: new Date(`${firstEmiOn}T00:00:00`),
      });
      const money = disbursementOf(principalPaise, schedule, upfrontMode, n, frequency);
      return { schedule, money };
    } catch {
      return null;
    }
  }, [principal, rate, tenure, frequency, structure, upfrontMode, firstEmiOn]);

  /** Keeps the first EMI one period after disbursement unless it is edited. */
  function onDisbursedChange(value: string) {
    setDisbursedOn(value);
    const base = new Date(`${value}T00:00:00`);
    if (Number.isNaN(base.getTime())) return;
    setFirstEmiOn(toInputDate(frequency === "WEEKLY" ? addDays(base, 7) : addMonths(base, 1)));
  }

  const marginWarning = preview && preview.money.marginPaise <= 0;

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-start">
      <div className="space-y-4">
        <FormError message={e._form} />

        <Card>
          <CardHeader title="Borrower" />
          <div className="p-5">
            <Field label="Customer" htmlFor="customerId" error={e.customerId} required>
              <Select id="customerId" name="customerId" defaultValue={defaultCustomerId ?? ""} required>
                <option value="" disabled>
                  Select a customer…
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.code} · {c.phone}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Terms" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Loan amount" htmlFor="principal" error={e.principal} required>
              <Input
                id="principal"
                name="principal"
                inputMode="decimal"
                value={principal}
                onChange={(ev) => setPrincipal(ev.target.value)}
                required
              />
            </Field>
            <Field
              label="Interest rate (% per month)"
              htmlFor="interestRatePct"
              error={e.interestRatePct}
              hint="Scope item 5: whether 3% is fixed for all loans is unconfirmed."
              required
            >
              <Input
                id="interestRatePct"
                name="interestRatePct"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(ev) => setRate(ev.target.value)}
                required
              />
            </Field>
            <Field label="Number of EMIs" htmlFor="tenure" error={e.tenure} required>
              <Input
                id="tenure"
                name="tenure"
                type="number"
                min="1"
                value={tenure}
                onChange={(ev) => setTenure(ev.target.value)}
                required
              />
            </Field>
            <Field label="EMI frequency" htmlFor="frequency" error={e.frequency} required>
              <Select
                id="frequency"
                name="frequency"
                value={frequency}
                onChange={(ev) => setFrequency(ev.target.value as LoanFrequency)}
              >
                {LOAN_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f === "WEEKLY" ? "Weekly" : "Monthly"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="EMI structure"
              htmlFor="structure"
              error={e.structure}
              hint={LOAN_STRUCTURE_HINT[structure]}
              className="sm:col-span-2"
              required
            >
              <Select
                id="structure"
                name="structure"
                value={structure}
                onChange={(ev) => setStructure(ev.target.value as LoanStructure)}
              >
                {LOAN_STRUCTURES.map((s) => (
                  <option key={s} value={s}>
                    {LOAN_STRUCTURE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Disbursement" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Disbursed on" htmlFor="disbursedOn" error={e.disbursedOn} required>
              <Input
                id="disbursedOn"
                name="disbursedOn"
                type="date"
                value={disbursedOn}
                onChange={(ev) => onDisbursedChange(ev.target.value)}
                required
              />
            </Field>
            <Field label="Mode" htmlFor="disbursementMode" error={e.disbursementMode} required>
              <Select id="disbursementMode" name="disbursementMode" defaultValue="ONLINE">
                <option value="ONLINE">Online</option>
                <option value="CASH">Cash</option>
              </Select>
            </Field>
            <Field label="First EMI on" htmlFor="firstEmiOn" error={e.firstEmiOn} required>
              <Input
                id="firstEmiOn"
                name="firstEmiOn"
                type="date"
                value={firstEmiOn}
                onChange={(ev) => setFirstEmiOn(ev.target.value)}
                required
              />
            </Field>
            <Field
              label="Upfront deduction"
              htmlFor="upfrontMode"
              error={e.upfrontMode}
              hint={UPFRONT_MODE_HINT[upfrontMode]}
              required
            >
              <Select
                id="upfrontMode"
                name="upfrontMode"
                value={upfrontMode}
                onChange={(ev) => setUpfrontMode(ev.target.value as UpfrontMode)}
              >
                {UPFRONT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {UPFRONT_MODE_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
          </div>
        </Card>
      </div>

      {/* Preview column */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader title="Disbursement summary" subtitle="Recalculated as you type" />
          {preview ? (
            <>
              <dl className="divide-y">
                {[
                  ["Loan amount", formatMoney(toPaise(principal || "0"))],
                  ["Withheld upfront", formatMoney(preview.money.upfrontPaise)],
                  ["Cash to customer", formatMoney(preview.money.netPaise)],
                  ["Still to collect", formatMoney(preview.money.collectPaise)],
                  ["Lender margin", formatMoney(preview.money.marginPaise)],
                  ["Effective rate", `${preview.money.effectiveMonthlyRatePct.toFixed(2)}% per month`],
                  ["Last EMI", formatDate(preview.schedule.lastEmiOn)],
                ].map(([label, value], index) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
                    <dt className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </dt>
                    <dd
                      className="text-base font-semibold tnum"
                      style={
                        index === 4
                          ? { color: marginWarning ? "var(--tone-risk)" : "var(--tone-money)" }
                          : undefined
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              {marginWarning ? (
                <div className="px-5 pb-5">
                  <Note tone="risk" title="This loan earns nothing">
                    On these terms the business collects exactly what it pays out. Deduct one EMI as
                    an upfront charge, or use an interest-bearing structure, to earn a return.
                  </Note>
                </div>
              ) : null}
            </>
          ) : (
            <p className="p-5 text-sm" style={{ color: "var(--text-muted)" }}>
              Enter an amount and tenure to preview the schedule.
            </p>
          )}
        </Card>

        {preview ? (
          <Card>
            <CardHeader
              title="EMI schedule"
              subtitle={`${preview.schedule.rows.length} installments`}
            />
            <div className="max-h-[340px] overflow-y-auto">
              <Table>
                <thead className="sticky top-0" style={{ background: "var(--bg-elev)" }}>
                  <tr>
                    <Th>#</Th>
                    <Th>Due date</Th>
                    <Th align="right">Principal</Th>
                    <Th align="right">Interest</Th>
                    <Th align="right">EMI</Th>
                  </tr>
                </thead>
                <tbody>
                  {preview.schedule.rows.map((row) => (
                    <Tr key={row.seq}>
                      <Td className="tnum">{row.seq}</Td>
                      <Td>{formatDate(row.dueDate)}</Td>
                      <Td align="right">{formatMoney(row.principalPaise)}</Td>
                      <Td align="right">{formatMoney(row.interestPaise)}</Td>
                      <Td align="right" className="font-semibold">
                        {formatMoney(row.totalPaise)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        ) : null}

        <div className="flex justify-end gap-2">
          <LinkButton href="/loans">Cancel</LinkButton>
          <SubmitButton pendingLabel="Disbursing…">Disburse loan</SubmitButton>
        </div>
      </div>
    </form>
  );
}
