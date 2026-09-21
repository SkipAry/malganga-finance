"use client";

import { Button } from "./ui/primitives";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
