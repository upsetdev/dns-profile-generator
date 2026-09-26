import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  /** One-line summary, always visible so the section reads without expanding. */
  description: string;
  /** Number of configured entries, shown as a pill when non-zero. */
  count?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * An optional form section boxed in its own card, collapsed by default. The
 * whole header row is the toggle, so the section reads as expandable without
 * having to aim at the chevron.
 */
export function CollapsibleSection({
  title,
  description,
  count,
  open,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="overflow-hidden rounded-lg border border-border bg-card"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="space-y-0.5">
            <span className="flex items-center gap-2">
              <span className="text-sm font-medium leading-none">{title}</span>
              {count !== undefined && count > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {count}
                </span>
              )}
            </span>
            <span className="block text-xs text-muted-foreground">
              {description}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {open ? "Hide" : "Customize"}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </span>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-2 border-t border-border/50 p-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
