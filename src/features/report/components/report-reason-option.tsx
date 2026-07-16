import { cn } from "@/lib/utils"

interface ReportReasonOptionProps {
  label: string
  selected: boolean
  onSelect: () => void
}

function ReportReasonOption({ label, selected, onSelect }: ReportReasonOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex w-full items-center justify-between"
    >
      <span className={cn("text-gray-900", selected ? "text-body-semibold-14" : "text-body-regular-14")}>
        {label}
      </span>
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          selected ? "border-primary" : "border-gray-200"
        )}
      >
        {selected && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  )
}

export { ReportReasonOption }
