"use client";

import { SubmitButton } from "./form-parts";

/**
 * Submit button that asks first. Destructive and irreversible actions
 * (deleting a customer, reversing a receipt, waiving an EMI) go through this.
 */
export function ConfirmSubmit({
  confirm,
  children,
  variant = "secondary",
  size = "md",
  pendingLabel = "Working…",
}: {
  confirm: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  pendingLabel?: string;
}) {
  return (
    <span
      onClickCapture={(event) => {
        if (!window.confirm(confirm)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>
        {children}
      </SubmitButton>
    </span>
  );
}
