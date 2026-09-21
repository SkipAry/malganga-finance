import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { toRupees } from "@/lib/money";
import { customerReport, investorReport } from "@/lib/reports";
import { getSessionUser } from "@/lib/session";

/** RFC 4180 quoting, plus a guard against spreadsheet formula injection. */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  // BOM so Excel opens UTF-8 (and the rupee sign) correctly.
  return `﻿${lines.join("\r\n")}`;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }

  const report = new URL(request.url).searchParams.get("report") ?? "customers";
  let filename: string;
  let csv: string;

  switch (report) {
    case "investors": {
      const rows = await investorReport();
      filename = "investor-report";
      csv = toCsv(
        ["Code", "Name", "Type", "Rate % / month", "Invested", "Withdrawn", "Interest paid", "Net held"],
        rows.map((r) => [
          r.code,
          r.name,
          r.type,
          r.interestRatePct,
          toRupees(r.investedPaise),
          toRupees(r.withdrawnPaise),
          toRupees(r.payoutPaise),
          toRupees(r.netPaise),
        ]),
      );
      break;
    }

    case "expenses": {
      const rows = await db.expense.findMany({
        include: { recordedBy: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      filename = "expenses";
      csv = toCsv(
        ["Date", "Category", "Description", "Amount", "Mode", "Recorded by"],
        rows.map((r) => [
          formatDate(r.date),
          r.category,
          r.description,
          toRupees(r.amountPaise),
          r.mode,
          r.recordedBy?.name ?? "",
        ]),
      );
      break;
    }

    case "payments": {
      const rows = await db.payment.findMany({
        include: {
          loan: { include: { customer: { select: { name: true, code: true } } } },
          installment: { select: { seq: true } },
        },
        orderBy: { receivedOn: "desc" },
      });
      filename = "payments";
      csv = toCsv(
        ["Received on", "Customer code", "Customer", "Loan", "EMI no.", "Amount", "Mode", "Reference"],
        rows.map((r) => [
          formatDate(r.receivedOn),
          r.loan.customer.code,
          r.loan.customer.name,
          r.loan.code,
          r.installment?.seq ?? "",
          toRupees(r.amountPaise),
          r.mode,
          r.reference ?? "",
        ]),
      );
      break;
    }

    default: {
      const rows = await customerReport();
      filename = "customer-report";
      csv = toCsv(
        ["Code", "Name", "Phone", "Loans", "Disbursed", "Collected", "Outstanding", "Overdue"],
        rows.map((r) => [
          r.code,
          r.name,
          r.phone,
          r.loans,
          toRupees(r.disbursedPaise),
          toRupees(r.collectedPaise),
          toRupees(r.outstandingPaise),
          toRupees(r.overduePaise),
        ]),
      );
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="malganga-${filename}-${stamp}.csv"`,
    },
  });
}
