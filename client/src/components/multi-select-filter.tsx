import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";

export function MultiSelectFilter({
  options,
  value,
  onChange,
  placeholder = "All",
  testId,
  width = "w-44",
  disabled = false,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  testId?: string;
  width?: string;
  disabled?: boolean;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);

  const displayLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? (options.find(o => o.value === value[0])?.label ?? value[0])
      : `${value.length} selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`${width} h-9 justify-between font-normal text-sm px-3`}
          data-testid={testId}
          disabled={disabled}
        >
          <span className={`truncate ${value.length === 0 ? "text-muted-foreground" : ""}`}>{displayLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <div className="space-y-0.5 max-h-64 overflow-y-auto">
          {options.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-1.5">No options</p>
          )}
          {options.map(opt => (
            <div
              key={opt.value}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-muted/60 select-none"
              onClick={() => toggle(opt.value)}
              data-testid={`${testId ?? "msf"}-opt-${opt.value}`}
            >
              <Checkbox
                checked={value.includes(opt.value)}
                className="pointer-events-none"
              />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </div>
        {value.length > 0 && (
          <div className="border-t mt-2 pt-2">
            <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
