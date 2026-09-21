"use client";

import { useActionState, useRef } from "react";

import { addCollateral, addDocument } from "@/actions/customers";
import { downscaleImage } from "@/lib/downscale-image";
import type { FormState } from "@/actions/auth";
import { FormError, SubmitButton } from "@/components/form-parts";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ASSET_TYPES, ASSET_TYPE_LABEL, DOCUMENT_KINDS, DOCUMENT_KIND_LABEL } from "@/lib/enums";

function Saved({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="tone-chip tone-money rounded-lg px-3 py-2 text-sm font-medium">
      {message}
    </p>
  );
}

export function DocumentForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addDocument, null);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        // Resize before the request is built, so a 5 MB phone photo never
        // reaches the 3 MB cap. Non-images and formats the browser cannot
        // decode are left alone and rejected server-side if truly too large.
        const picked = formData.get("file");
        if (picked instanceof File && picked.size > 0) {
          const smaller = await downscaleImage(picked);
          if (smaller) formData.set("file", smaller, smaller.name);
        }
        await action(formData);
        formRef.current?.reset();
      }}
      className="space-y-3.5 p-5"
    >
      <input type="hidden" name="customerId" value={customerId} />
      <FormError message={e._form} />
      <Saved message={state?.message} />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Document type" htmlFor="doc-kind" error={e.kind} required>
          <Select id="doc-kind" name="kind" defaultValue="AADHAAR" required>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Document number" htmlFor="doc-number" error={e.number} hint="Leave blank for photographs">
          <Input id="doc-number" name="number" />
        </Field>
      </div>

      <Field label="Scan or photo" htmlFor="doc-file" error={e.file} hint="JPG, PNG or PDF. Photos are resized automatically; PDFs must be under 3 MB.">
        <input
          id="doc-file"
          name="file"
          type="file"
          accept="image/*,application/pdf"
          className="w-full text-sm file:mr-3 file:rounded-lg file:border file:bg-[var(--bg-sunken)] file:px-3 file:py-1.5 file:text-sm"
        />
      </Field>

      <SubmitButton size="sm">Add document</SubmitButton>
    </form>
  );
}

export function CollateralForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addCollateral, null);
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
      <input type="hidden" name="customerId" value={customerId} />
      <FormError message={e._form} />
      <Saved message={state?.message} />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Asset type" htmlFor="col-type" error={e.assetType} required>
          <Select id="col-type" name="assetType" defaultValue="GOLD" required>
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estimated value" htmlFor="col-value" error={e.value} required>
          <Input id="col-value" name="value" inputMode="decimal" placeholder="50,000" required />
        </Field>
      </div>

      <Field label="Description" htmlFor="col-desc" error={e.description} required>
        <Textarea id="col-desc" name="description" rows={2} placeholder="22ct gold chain, 18g, hallmarked" required />
      </Field>

      <SubmitButton size="sm">Record collateral</SubmitButton>
    </form>
  );
}
