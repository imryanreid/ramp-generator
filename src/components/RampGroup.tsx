// ==============================================
// RAMP GROUP
// A titled section of ramps (Brand, Accents,
// Neutral, Status), each rendered as a row of
// swatches labelled with its step number. Clicking
// a swatch copies its hex.
//
// Each row carries a checkbox beside its name. An
// unchecked ramp is still generated and still
// copyable — it just dims and drops out of the
// export and the agent block.
// ==============================================
import { readableText, formatColor, type Ramp, type ColorFormat } from "../lib/color"
import { Check } from "@phosphor-icons/react"
import { cn } from "../lib/utils"
import CopyText from "./CopyText"
import RowToggle from "./RowToggle"

type Props = {
  title: string
  ramps: readonly Ramp[]
  format: ColorFormat
  excluded: ReadonlySet<string>
  onToggle: (name: string) => void
  onSetMany: (names: string[], off: boolean) => void
}

/** Renders a titled section of one or more 11-step ramps. */
export default function RampGroup({ title, ramps, format, excluded, onToggle, onSetMany }: Props) {
  if (ramps.length === 0) return null
  const names = ramps.map((r) => r.name)
  const on = names.filter((n) => !excluded.has(n)).length

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        {ramps.length > 1 && (
          <RowToggle
            checked={on === names.length}
            indeterminate={on > 0 && on < names.length}
            onChange={() => onSetMany(names, on === names.length)}
            label={`${on === names.length ? "Exclude" : "Include"} every ramp in ${title}`}
          />
        )}
      </div>
      <div className="flex flex-col gap-5">
        {ramps.map((ramp) => (
          <RampRow
            key={ramp.name}
            ramp={ramp}
            format={format}
            included={!excluded.has(ramp.name)}
            onToggle={() => onToggle(ramp.name)}
          />
        ))}
      </div>
    </section>
  )
}

function RampRow({
  ramp,
  format,
  included,
  onToggle,
}: {
  ramp: Ramp
  format: ColorFormat
  included: boolean
  onToggle: () => void
}) {
  return (
    <div>
      {/* Label first, then its toggle — matching the section headings above. */}
      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn("font-mono text-xs transition-colors", included ? "text-ash" : "text-line")}>
          {ramp.name}
        </span>
        <RowToggle
          checked={included}
          onChange={onToggle}
          label={`${included ? "Exclude" : "Include"} the ${ramp.name} ramp in exports`}
        />
        {!included && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-line">
            not exported
          </span>
        )}
      </div>
      <div
        className={cn(
          "flex min-w-0 gap-1 pb-1 transition-opacity",
          included ? "opacity-100" : "opacity-35",
        )}
      >
        {ramp.swatches.map((s) => {
          const fg = readableText(s.hex)
          const value = formatColor(s.hex, format)
          return (
            <CopyText
              key={s.step}
              value={value}
              title={`Copy ${ramp.name}-${s.step} · ${value}`}
              className="group min-w-0 flex-1 basis-0"
            >
              {(copied) => (
                <div
                  className="flex h-20 flex-col justify-between overflow-hidden rounded-md p-2 text-left ring-1 ring-inset ring-black/5"
                  style={{ backgroundColor: s.hex, color: fg }}
                >
                  <div className="flex items-center justify-between text-[10px] font-medium">
                    {/* Step number crossfades to a check on copy. */}
                    <span className="relative inline-flex h-3 min-w-[1.4em] items-center">
                      <span
                        className="transition-all duration-200 ease-out"
                        style={{ opacity: copied ? 0 : 1, transform: copied ? "translateY(-2px)" : "none" }}
                      >
                        {s.step}
                      </span>
                      <Check
                        size={11}
                        weight="bold"
                        aria-hidden="true"
                        className="absolute left-0 transition-all duration-200 ease-out"
                        style={{ opacity: copied ? 1 : 0, transform: copied ? "none" : "translateY(2px)" }}
                      />
                    </span>
                    {s.isSource && (
                      <span
                        className="rounded-full px-1 py-px text-[8px] uppercase tracking-wide ring-1"
                        style={{ borderColor: fg }}
                      >
                        base
                      </span>
                    )}
                  </div>
                  {/* Uppercase suits a bare hex; it would mangle `oklch(...)`. */}
                  <span
                    className={cn(
                      "truncate font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100",
                      format === "hex" && "uppercase",
                    )}
                  >
                    {format === "hex" ? s.hex.replace("#", "") : value}
                  </span>
                </div>
              )}
            </CopyText>
          )
        })}
      </div>
    </div>
  )
}
