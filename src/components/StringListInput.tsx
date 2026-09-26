import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface StringListInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel: string;
  /** Accessible label prefix for each row, e.g. "Excluded domain" -> "Excluded domain 1". */
  ariaLabel?: string;
  /** Extra classes for each text input (e.g. "font-mono"). */
  inputClassName?: string;
}

/**
 * A controlled list of free-text values rendered one input per line, with a
 * remove button per row and an "Add" button to append a new empty row. New
 * rows are auto-focused so values can be entered one at a time.
 */
export function StringListInput({
  values,
  onChange,
  placeholder,
  addLabel,
  ariaLabel,
  inputClassName,
}: StringListInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  // After a row is added, move focus to it.
  useEffect(() => {
    if (focusIndexRef.current !== null) {
      inputsRef.current[focusIndexRef.current]?.focus();
      focusIndexRef.current = null;
    }
  });

  const updateAt = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const add = () => {
    focusIndexRef.current = values.length;
    onChange([...values, ""]);
  };

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="space-y-2">
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={value}
                onChange={(e) => updateAt(index, e.target.value)}
                placeholder={placeholder}
                className={inputClassName}
                aria-label={ariaLabel ? `${ariaLabel} ${index + 1}` : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${ariaLabel ?? "entry"} ${index + 1}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
