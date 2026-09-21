import { LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-faint)" }}>
          404
        </p>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.02em]">Page not found</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--text-muted)" }}>
          That record may have been removed, or the link is wrong.
        </p>
        <div className="mt-6">
          <LinkButton href="/" variant="primary">Back to dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}
