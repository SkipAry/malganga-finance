"use client";

import { useActionState } from "react";

import { saveCustomer } from "@/actions/customers";
import type { FormState } from "@/actions/auth";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Card, CardHeader, Field, Input, LinkButton, Textarea } from "@/components/ui/primitives";
import { toInputDate } from "@/lib/dates";

export type CustomerFormValues = {
  id?: string;
  name?: string;
  nameMr?: string | null;
  phone?: string;
  altPhone?: string | null;
  email?: string | null;
  dob?: Date | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  shopName?: string | null;
  shopActNo?: string | null;
  referrerName?: string | null;
  referrerPhone?: string | null;
  referrerRelation?: string | null;
  notes?: string | null;
};

export function CustomerForm({ values = {} }: { values?: CustomerFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveCustomer, null);
  const e = state?.errors ?? {};

  return (
    <form action={action} className="space-y-4">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormError message={e._form} />

      <Card>
        <CardHeader title="Identity" subtitle="Who is borrowing" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={e.name} required>
            <Input id="name" name="name" defaultValue={values.name ?? ""} required autoFocus />
          </Field>
          <Field
            label="Name in Marathi"
            htmlFor="nameMr"
            error={e.nameMr}
            hint="Optional. Shown when the interface is set to Marathi."
          >
            <Input
              id="nameMr"
              name="nameMr"
              lang="mr"
              defaultValue={values.nameMr ?? ""}
              placeholder="उदित गरूड"
            />
          </Field>
          <Field label="Mobile number" htmlFor="phone" error={e.phone} required>
            <Input id="phone" name="phone" inputMode="tel" defaultValue={values.phone ?? ""} required />
          </Field>
          <Field label="Alternate number" htmlFor="altPhone" error={e.altPhone}>
            <Input id="altPhone" name="altPhone" inputMode="tel" defaultValue={values.altPhone ?? ""} />
          </Field>
          <Field label="Email" htmlFor="email" error={e.email}>
            <Input id="email" name="email" type="email" defaultValue={values.email ?? ""} />
          </Field>
          <Field label="Date of birth" htmlFor="dob" error={e.dob}>
            <Input id="dob" name="dob" type="date" defaultValue={toInputDate(values.dob)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Address line 1" htmlFor="addressLine1" error={e.addressLine1} className="sm:col-span-2">
            <Input id="addressLine1" name="addressLine1" defaultValue={values.addressLine1 ?? ""} />
          </Field>
          <Field label="Address line 2" htmlFor="addressLine2" className="sm:col-span-2">
            <Input id="addressLine2" name="addressLine2" defaultValue={values.addressLine2 ?? ""} />
          </Field>
          <Field label="City / town" htmlFor="city">
            <Input id="city" name="city" defaultValue={values.city ?? ""} />
          </Field>
          <Field label="State" htmlFor="state">
            <Input id="state" name="state" defaultValue={values.state ?? "Maharashtra"} />
          </Field>
          <Field label="PIN code" htmlFor="pincode">
            <Input id="pincode" name="pincode" inputMode="numeric" defaultValue={values.pincode ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Business" subtitle="Shop Act licence details, where applicable" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Shop / business name" htmlFor="shopName">
            <Input id="shopName" name="shopName" defaultValue={values.shopName ?? ""} />
          </Field>
          <Field label="Shop Act licence no." htmlFor="shopActNo">
            <Input id="shopActNo" name="shopActNo" defaultValue={values.shopActNo ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Referral" subtitle="Who introduced this customer" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Field label="Referrer name" htmlFor="referrerName">
            <Input id="referrerName" name="referrerName" defaultValue={values.referrerName ?? ""} />
          </Field>
          <Field label="Referrer contact" htmlFor="referrerPhone">
            <Input id="referrerPhone" name="referrerPhone" inputMode="tel" defaultValue={values.referrerPhone ?? ""} />
          </Field>
          <Field
            label="Relationship"
            htmlFor="referrerRelation"
            hint="Scope item 3: multiple referrers per customer is not yet confirmed."
          >
            <Input id="referrerRelation" name="referrerRelation" defaultValue={values.referrerRelation ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notes" />
        <div className="p-5">
          <Field label="Internal notes" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={values.notes ?? ""} rows={3} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <LinkButton href={values.id ? `/customers/${values.id}` : "/customers"}>Cancel</LinkButton>
        <SubmitButton>{values.id ? "Save changes" : "Create customer"}</SubmitButton>
      </div>
    </form>
  );
}
