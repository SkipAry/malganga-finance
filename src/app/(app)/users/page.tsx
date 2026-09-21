import type { Metadata } from "next";

import { UserForm } from "./user-form";
import { toggleUserActive } from "@/actions/operations";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/dates";
import { ROLE_LABEL, type Role } from "@/lib/enums";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const admin = await requireAdmin();

  const [users, investors, auditLog] = await Promise.all([
    db.user.findMany({
      include: { investor: { select: { name: true, code: true } } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.investor.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    db.auditLog.findMany({
      take: 25,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Users & roles"
        subtitle="Administrators manage everything; agents collect; investors see only their own money."
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Accounts" subtitle={`${users.length} login${users.length === 1 ? "" : "s"}`} />
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Linked to</Th>
                  <Th align="right">Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-medium">
                      {u.name}
                      {u.id === admin.id ? (
                        <span className="ml-2 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                          you
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {u.email}
                    </Td>
                    <Td>
                      <Badge tone={u.role === "ADMIN" ? "brand" : u.role === "AGENT" ? "warn" : "neutral"}>
                        {ROLE_LABEL[u.role as Role] ?? u.role}
                      </Badge>
                    </Td>
                    <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {u.investor ? `${u.investor.name} · ${u.investor.code}` : "—"}
                    </Td>
                    <Td align="right">
                      <Badge tone={u.isActive ? "money" : "risk"}>
                        {u.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {u.id === admin.id ? null : (
                        <form action={toggleUserActive}>
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmSubmit
                            size="sm"
                            variant="ghost"
                            confirm={
                              u.isActive
                                ? `Disable ${u.name}? They will not be able to sign in.`
                                : `Re-enable ${u.name}?`
                            }
                          >
                            {u.isActive ? "Disable" : "Enable"}
                          </ConfirmSubmit>
                        </form>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader title="Recent activity" subtitle="Who changed what" />
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>User</Th>
                  <Th>Action</Th>
                  <Th>Record</Th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log) => (
                  <Tr key={log.id}>
                    <Td className="text-[13px]">{formatDateTime(log.createdAt)}</Td>
                    <Td className="text-[13px]">{log.user?.name ?? "—"}</Td>
                    <Td className="text-[13px]">{log.action}</Td>
                    <Td className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      {log.entity}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>

        <Card>
          <CardHeader title="Add a user" />
          <UserForm investors={investors} />
          <p className="border-t px-5 py-3 text-[12px]" style={{ color: "var(--text-faint)" }}>
            Signed in as {admin.name} · {formatDate(new Date())}
          </p>
        </Card>
      </div>
    </>
  );
}
