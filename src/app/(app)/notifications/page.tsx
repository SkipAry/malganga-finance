import type { Metadata } from "next";
import Link from "next/link";

import { cancelNotification, dispatchDueReminders } from "@/actions/operations";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SubmitButton } from "@/components/form-parts";
import { StatTile } from "@/components/stat-tile";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Note,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/dates";
import { NOTIFICATION_KIND_LABEL, type NotificationKind } from "@/lib/enums";
import { OVERDUE_REPEAT_DAYS } from "@/lib/notify";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Reminders" };

const TABS = [
  ["PENDING", "Queued"],
  ["SENT", "Sent"],
  ["FAILED", "Failed"],
  ["CANCELLED", "Cancelled"],
] as const;

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "SENT" ? "money" : status === "FAILED" ? "risk" : status === "PENDING" ? "warn" : "neutral";
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return <Badge tone={tone}>{label}</Badge>;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const { status = "PENDING" } = await searchParams;
  const now = new Date();

  const [rows, counts, dueNow] = await Promise.all([
    db.notification.findMany({
      where: { status },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        loan: { select: { id: true, code: true } },
        installment: { select: { seq: true, dueDate: true } },
      },
      orderBy: { scheduledFor: "asc" },
      take: 150,
    }),
    db.notification.groupBy({ by: ["status"], _count: true }),
    db.notification.count({ where: { status: "PENDING", scheduledFor: { lte: now } } }),
  ]);

  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        title="EMI reminders"
        subtitle="One reminder the day before, one on the due date, and repeats while overdue."
        actions={
          <form action={dispatchDueReminders}>
            <SubmitButton variant="primary" pendingLabel="Sending…">
              {dueNow > 0 ? `Send ${dueNow} due now` : "Send due reminders"}
            </SubmitButton>
          </form>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Due to send now" value={String(dueNow)} tone={dueNow > 0 ? "warn" : "money"} />
        <StatTile label="Queued" value={String(countOf("PENDING"))} />
        <StatTile label="Sent" value={String(countOf("SENT"))} tone="money" />
        <StatTile label="Failed" value={String(countOf("FAILED"))} tone={countOf("FAILED") ? "risk" : "neutral"} />
      </section>

      <div className="mt-4">
        <Note tone="warn" title="Delivery is not connected yet">
          Reminders are composed and queued correctly, but they are written to the server log
          instead of being delivered. Scope section 5 item 7 (SMS, WhatsApp or email, and which
          gateway) is unanswered — supply a provider and it plugs into the single dispatcher in{" "}
          <code>src/lib/notify.ts</code>. Overdue reminders currently repeat every{" "}
          {OVERDUE_REPEAT_DAYS} days (item 8).
        </Note>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Reminder queue"
          action={
            <div className="flex gap-1">
              {TABS.map(([value, label]) => (
                <Link
                  key={value}
                  href={`/notifications?status=${value}`}
                  className="rounded-lg px-3 py-1.5 text-[13px] transition-colors"
                  style={
                    status === value
                      ? { background: "var(--bg-sunken)", fontWeight: 500 }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {label}
                  <span className="ml-1.5 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                    {countOf(value)}
                  </span>
                </Link>
              ))}
            </div>
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="Nothing here"
            description="Reminders are queued automatically when a loan is disbursed."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Loan / EMI</Th>
                <Th>Reminder</Th>
                <Th>Scheduled</Th>
                <Th>Message</Th>
                <Th align="right">Status</Th>
                {status === "PENDING" ? <Th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <Tr key={n.id}>
                  <Td>
                    <Link href={`/customers/${n.customerId}`} className="font-medium hover:underline">
                      {n.customer.name}
                    </Link>
                    <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {n.customer.phone}
                    </span>
                  </Td>
                  <Td>
                    <Link href={`/loans/${n.loanId}`} className="hover:underline">
                      {n.loan.code}
                    </Link>
                    <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                      EMI {n.installment.seq} · due {formatDate(n.installment.dueDate)}
                    </span>
                  </Td>
                  <Td className="text-[13px]">
                    {NOTIFICATION_KIND_LABEL[n.kind as NotificationKind] ?? n.kind}
                    <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {n.channel}
                    </span>
                  </Td>
                  <Td className="text-[13px]">
                    {formatDate(n.scheduledFor)}
                    {n.sentAt ? (
                      <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>
                        sent {formatDateTime(n.sentAt)}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="max-w-sm text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                    <span className="line-clamp-2">{n.message}</span>
                    {n.error ? <span className="block text-risk-500">{n.error}</span> : null}
                  </Td>
                  <Td align="right"><StatusBadge status={n.status} /></Td>
                  {status === "PENDING" ? (
                    <Td align="right">
                      <form action={cancelNotification}>
                        <input type="hidden" name="id" value={n.id} />
                        <ConfirmSubmit size="sm" variant="ghost" confirm="Cancel this reminder?">
                          Cancel
                        </ConfirmSubmit>
                      </form>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
