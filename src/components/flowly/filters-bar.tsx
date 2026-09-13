import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABEL, type Priority } from "@/services";
import type { DuePreset, SortMode, ViewPreferences } from "@/services/preferences";

const duePresets: { value: DuePreset; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "none", label: "No Due Date" },
];

interface Props {
  prefs: ViewPreferences;
  onChange: (prefs: ViewPreferences) => void;
  active: boolean;
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function FiltersBar({ prefs, onChange, active }: Props) {
  const togglePriority = (p: Priority) =>
    onChange({
      ...prefs,
      priorities: prefs.priorities.includes(p)
        ? prefs.priorities.filter((x) => x !== p)
        : [...prefs.priorities, p],
    });

  const toggleDue = (d: DuePreset) =>
    onChange({
      ...prefs,
      due: prefs.due.includes(d) ? prefs.due.filter((x) => x !== d) : [...prefs.due, d],
    });

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </span>
        {PRIORITIES.map((p) => (
          <Chip key={p} selected={prefs.priorities.includes(p)} onClick={() => togglePriority(p)}>
            {PRIORITY_LABEL[p]}
          </Chip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
        {duePresets.map((d) => (
          <Chip key={d.value} selected={prefs.due.includes(d.value)} onClick={() => toggleDue(d.value)}>
            {d.label}
          </Chip>
        ))}
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange({ ...prefs, priorities: [], due: [] })}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Sort</span>
        <Select value={prefs.sort} onValueChange={(v) => onChange({ ...prefs, sort: v as SortMode })}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual order</SelectItem>
            <SelectItem value="due">Due date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}
