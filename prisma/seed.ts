/**
 * Demo data. Enough of a book that every screen has something real to show:
 * loans at different stages, overdue EMIs, investors, expenses and reminders.
 *
 * Run with `npm run db:seed` (or `npm run db:reset` to wipe first).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { addDays, addMonths, startOfDay } from "../src/lib/dates";
import { applyPayment, createLoanWithSchedule } from "../src/lib/loan-service";
import { toPaise } from "../src/lib/money";

const db = new PrismaClient();

const today = startOfDay(new Date());

async function wipe() {
  // Child-first so foreign keys never block the reset.
  await db.notification.deleteMany();
  await db.payment.deleteMany();
  await db.installment.deleteMany();
  await db.collateral.deleteMany();
  await db.document.deleteMany();
  await db.loan.deleteMany();
  await db.investorTxn.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.deleteMany();
  await db.investor.deleteMany();
  await db.customer.deleteMany();
  await db.expense.deleteMany();
}

async function main() {
  await wipe();

  /* ------------------------------------------------------------- investors */

  const investors = await Promise.all(
    [
      { code: "IN-0001", name: "Ramesh Malganga", phone: "9822011001", type: "INTERNAL", interestRatePct: 1.5 },
      { code: "IN-0002", name: "Sunita Deshmukh", phone: "9822011002", type: "EXTERNAL", interestRatePct: 2.0 },
      { code: "IN-0003", name: "Prakash Joshi", phone: "9822011003", type: "EXTERNAL", interestRatePct: 2.25 },
    ].map((data, i) =>
      db.investor.create({
        data: {
          ...data,
          email: `investor${i + 1}@example.in`,
          address: "Pune, Maharashtra",
          transactions: {
            create: [
              { type: "INVESTMENT", amountPaise: toPaise([1500000, 800000, 500000][i]), date: addMonths(today, -8), mode: "ONLINE" },
              ...(i === 1
                ? [{ type: "INTEREST_PAYOUT", amountPaise: toPaise(16000), date: addMonths(today, -1), mode: "ONLINE" }]
                : []),
              ...(i === 2
                ? [{ type: "WITHDRAWAL", amountPaise: toPaise(100000), date: addMonths(today, -2), mode: "CASH" }]
                : []),
            ],
          },
        },
      }),
    ),
  );

  /* ----------------------------------------------------------------- users */

  const [adminPw, agentPw, investorPw] = await Promise.all([
    bcrypt.hash("Admin@12345", 10),
    bcrypt.hash("Agent@12345", 10),
    bcrypt.hash("Invest@12345", 10),
  ]);

  await db.user.createMany({
    data: [
      { email: "admin@malganga.in", name: "Anil Malganga", passwordHash: adminPw, role: "ADMIN" },
      { email: "agent@malganga.in", name: "Vikas Pawar", passwordHash: agentPw, role: "AGENT" },
      {
        email: "investor@malganga.in",
        name: "Sunita Deshmukh",
        passwordHash: investorPw,
        role: "INVESTOR",
        investorId: investors[1].id,
      },
    ],
  });

  const admin = await db.user.findUniqueOrThrow({ where: { email: "admin@malganga.in" } });

  /* ------------------------------------------------------------- customers */

  const customerSeeds = [
    { name: "Mahesh Kulkarni", phone: "9822022001", shopName: "Mahesh Kirana Stores", city: "Pune" },
    { name: "Shalini Patil", phone: "9822022002", shopName: "Shalini Tailors", city: "Pimpri" },
    { name: "Imran Shaikh", phone: "9822022003", shopName: "Shaikh Auto Spares", city: "Pune" },
    { name: "Ganesh Jadhav", phone: "9822022004", shopName: "Jadhav Vegetables", city: "Chinchwad" },
    { name: "Rekha More", phone: "9822022005", shopName: "More Beauty Parlour", city: "Pune" },
    { name: "Santosh Gaikwad", phone: "9822022006", shopName: "Gaikwad Cycle Mart", city: "Hadapsar" },
  ];

  const customers = await Promise.all(
    customerSeeds.map((c, i) =>
      db.customer.create({
        data: {
          ...c,
          code: `CU-${String(i + 1).padStart(4, "0")}`,
          addressLine1: `${10 + i}, Shivaji Nagar`,
          state: "Maharashtra",
          pincode: `4110${(i % 9) + 1}1`,
          shopActNo: `SA/PUN/${2024 - (i % 3)}/${1000 + i}`,
          referrerName: i % 2 === 0 ? "Suresh Kadam" : "Nilesh Bhosale",
          referrerPhone: i % 2 === 0 ? "9822099001" : "9822099002",
          referrerRelation: i % 2 === 0 ? "Existing customer" : "Local agent",
          documents: {
            create: [
              { kind: "AADHAAR", number: `XXXX XXXX ${1000 + i}` },
              { kind: "PAN", number: `ABCPK${1000 + i}L` },
              { kind: "SHOP_ACT", number: `SA/PUN/${1000 + i}` },
            ],
          },
          collaterals:
            i % 2 === 0
              ? {
                  create: [
                    {
                      assetType: i === 0 ? "GOLD" : "VEHICLE",
                      description: i === 0 ? "22ct gold chain, 18g, hallmarked" : "Bajaj Platina, MH12 AB 1234",
                      valuePaise: toPaise(i === 0 ? 85000 : 42000),
                    },
                  ],
                }
              : undefined,
        },
      }),
    ),
  );

  /* ----------------------------------------------------------------- loans */

  // Mix of ages and shapes so the dashboard is not uniform.
  const loanSeeds = [
    // The scope-document worked example, disbursed 9 weeks ago and being repaid.
    { customer: 0, principal: 100000, tenure: 14, frequency: "WEEKLY", structure: "FLAT_UPFRONT", weeksAgo: 9, paid: 7 },
    { customer: 1, principal: 50000, tenure: 10, frequency: "WEEKLY", structure: "FLAT_UPFRONT", weeksAgo: 6, paid: 5 },
    // Deliberately behind: drives the overdue tiles and the collection queue.
    { customer: 2, principal: 150000, tenure: 12, frequency: "MONTHLY", structure: "INTEREST_PRINCIPAL", weeksAgo: 20, paid: 2 },
    { customer: 3, principal: 75000, tenure: 14, frequency: "WEEKLY", structure: "FLAT_UPFRONT", weeksAgo: 3, paid: 2 },
    { customer: 4, principal: 200000, tenure: 6, frequency: "MONTHLY", structure: "INTEREST_ONLY", weeksAgo: 8, paid: 1 },
    // Fully repaid, so a closed loan exists.
    { customer: 5, principal: 30000, tenure: 6, frequency: "WEEKLY", structure: "FLAT_UPFRONT", weeksAgo: 10, paid: 6 },
  ] as const;

  for (const seed of loanSeeds) {
    const disbursedOn = addDays(today, -seed.weeksAgo * 7);
    const firstEmiOn =
      seed.frequency === "WEEKLY" ? addDays(disbursedOn, 7) : addMonths(disbursedOn, 1);

    const loan = await db.$transaction((tx) =>
      createLoanWithSchedule(tx, {
        customerId: customers[seed.customer].id,
        principalPaise: toPaise(seed.principal),
        interestRatePct: 3,
        tenure: seed.tenure,
        frequency: seed.frequency,
        structure: seed.structure,
        disbursedOn,
        disbursementMode: seed.customer % 2 === 0 ? "ONLINE" : "CASH",
        firstEmiOn,
        upfrontMode: seed.structure === "FLAT_UPFRONT" ? "EXTRA_CHARGE" : "NONE",
        notes: null,
      }),
    );

    const collectable = loan.installments.filter((i) => i.status === "PENDING");
    for (const inst of collectable.slice(0, seed.paid)) {
      await db.$transaction((tx) =>
        applyPayment(tx, {
          loanId: loan.id,
          installmentId: inst.id,
          amountPaise: inst.totalPaise,
          mode: seed.customer % 3 === 0 ? "ONLINE" : "CASH",
          receivedOn: inst.dueDate,
          reference: seed.customer % 3 === 0 ? `UTR${Math.floor(Math.random() * 1e9)}` : null,
          recordedById: admin.id,
        }),
      );
    }
  }

  /* -------------------------------------------------------------- expenses */

  const expenseSeeds = [
    ["DAILY", 850, "Office tea and refreshments", 2],
    ["TRANSPORT", 2400, "Field collection visits - fuel", 5],
    ["MONTHLY", 18000, "Office rent", 12],
    ["ACCOUNTING", 6500, "Quarterly bookkeeping fee", 20],
    ["MAINTENANCE", 3200, "Computer and printer servicing", 28],
    ["TRANSPORT", 1800, "Field collection visits - fuel", 33],
    ["DAILY", 1150, "Stationery and receipt books", 40],
    ["MONTHLY", 18000, "Office rent", 43],
  ] as const;

  await db.expense.createMany({
    data: expenseSeeds.map(([category, amount, description, daysAgo]) => ({
      category,
      amountPaise: toPaise(amount),
      description,
      date: addDays(today, -daysAgo),
      mode: category === "MONTHLY" ? "ONLINE" : "CASH",
      recordedById: admin.id,
    })),
  });

  /* ---------------------------------------------------------------- report */

  const [loans, installments, notifications] = await Promise.all([
    db.loan.count(),
    db.installment.count(),
    db.notification.count(),
  ]);

  console.log(`Seeded:
  ${customers.length} customers
  ${investors.length} investors
  ${loans} loans / ${installments} installments
  ${notifications} queued reminders
  ${expenseSeeds.length} expenses

Sign in:
  admin@malganga.in     Admin@12345
  agent@malganga.in     Agent@12345
  investor@malganga.in  Invest@12345`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
