import { cn } from "@/lib/utils";

/**
 * House of 3D brand mark: a print nozzle laying down a filament that
 * becomes a house — a stroke-only simplification of the press-kit logo
 * so it stays legible at 16–32 px. Colour comes from `currentColor`.
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 3h6v2.5L13.5 7h-3L9 5.5z" />
      <path d="M12 7v1c-2.8 0-2.8 3.2 0 3.2" />
      <path d="M5.5 16.5 12 11.2l6.5 5.3" />
      <path d="M7.5 15v6h9v-6" />
      <path d="M11 17.5h2v2h-2z" />
    </svg>
  );
}

/** Rounded-square tile with the glyph — the sidebar / login / favicon shape. */
export function BrandMark({
  className,
  glyphClassName,
}: {
  className?: string;
  glyphClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-[var(--brand,var(--primary))] text-primary-foreground",
        className,
      )}
    >
      <BrandGlyph className={cn("h-[62%] w-[62%]", glyphClassName)} />
    </div>
  );
}

export const BRAND_NAME = "House of 3D";
