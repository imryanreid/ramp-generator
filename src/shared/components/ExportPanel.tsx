// ==============================================
// EXPORT PANEL
// The export flow every tool in the family renders.
// Shell and behaviour only — the formats come from
// the tool.
//
// It opens on a choice rather than on tabs: take the
// tokens as code, or take a prompt pointing an agent
// at this exact configuration. That fork is the
// product thesis rendered as a control, and it is the
// same in every tool.
//
// A person moving between two tools should not notice
// they changed apps, so nothing here is
// configurable: the modal width, the terminal that
// stays dark in light mode, the spring underline, the
// lowercase mono affordances and the crossfade are
// fixed. What varies is which tabs exist, what each
// one emits, and what it costs.
//
// SHARED FILE. Authored in ramps-studio, copied
// outward. Don't edit it downstream.
// ==============================================
import { useState, type CSSProperties, type ReactNode } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowLeft, Code, DownloadSimple, Sparkle, CaretRight } from "@phosphor-icons/react"
import { cn } from "../utils"
import { DUR, HOVER_LIFT, SPRING_PILL } from "../motion"
import CopyText from "./CopyText"

/**
 * What a conversion costs on this target.
 *
 * Omit it entirely when the conversion is exact. A note that appears on every
 * tab teaches people to stop reading it; a note that appears sometimes means
 * something every time it does.
 */
export type FidelityNote = {
  /** One line, always visible. State the cost, with the number. */
  summary: string
  /** The full explanation, behind a disclosure. */
  detail?: ReactNode
}

export type ExportFormat = {
  id: string
  /** The tab. Name the destination, not the encoding — "Figma", not "DTCG". */
  label: string
  filename: string
  mime: string
  /**
   * What the terminal shows. Called only for the active tab, so inactive
   * formats cost nothing.
   *
   * For a binary format this is a human-readable summary rather than the file
   * itself — see `bytes`.
   */
  render: () => string
  /**
   * The bytes to download, when the file isn't text.
   *
   * Optional, and absent on every text format, so the common case stays
   * `render()` and nothing else. When it's here the download ships these bytes
   * and `render()` is only ever the preview.
   *
   * Without this a binary file has to travel as a string, and `new Blob([str])`
   * UTF-8-encodes it — every byte above 0x7F becomes two, so the file arrives
   * corrupt and roughly 1.5x too big. That failure is silent: the download
   * succeeds and the file is simply broken.
   */
  bytes?: () => Uint8Array
  /** This tab's own settings, rendered at the left of the bar. */
  options?: ReactNode
  fidelity?: FidelityNote
}

function download(format: ExportFormat, text: string) {
  // Binary when the format offers bytes, text otherwise. `text` is passed in
  // rather than re-rendered so the download is byte-identical to the preview
  // the person is looking at.
  const body: BlobPart = format.bytes ? (format.bytes() as BlobPart) : text
  const blob = new Blob([body], { type: format.mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = format.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type Stage = "choose" | "code" | "prompt"

export default function ExportPanel({
  formats,
  agentPrompt,
  codeBlurb,
  promptBlurb = "A ready-to-paste prompt with a link to this configuration, for Claude, GPT, or any coding agent.",
}: {
  formats: ExportFormat[]
  /** The prompt handed to an agent. Built by the tool; it knows its own URL. */
  agentPrompt: string
  codeBlurb: string
  promptBlurb?: string
}) {
  const [stage, setStage] = useState<Stage>("choose")

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: DUR.stage, ease: "easeOut" }}
      >
        {stage === "choose" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              icon={<Code size={22} weight="regular" />}
              title="Export code"
              body={codeBlurb}
              onClick={() => setStage("code")}
            />
            <ChoiceCard
              icon={<Sparkle size={22} weight="regular" />}
              title="Copy agent prompt"
              body={promptBlurb}
              onClick={() => setStage("prompt")}
            />
          </div>
        )}
        {stage === "code" && <CodeExport formats={formats} onBack={() => setStage("choose")} />}
        {stage === "prompt" && (
          <PromptExport prompt={agentPrompt} onBack={() => setStage("choose")} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}

function ChoiceCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: ReactNode
  title: string
  body: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group border-line hover:border-ink/30 hover:bg-ink/[0.03] flex h-full flex-col items-start rounded-lg border p-4 text-left",
        HOVER_LIFT,
      )}
    >
      <span className="text-ink mb-3">{icon}</span>
      <span className="font-display mb-1 flex w-full items-center justify-between gap-2 text-base font-semibold tracking-tight">
        {title}
        <CaretRight
          size={14}
          weight="bold"
          className="text-ash shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </span>
      <span className="text-ash text-sm leading-relaxed">{body}</span>
    </button>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-ash hover:text-ink mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] transition-colors"
    >
      <ArrowLeft size={13} weight="bold" />
      back
    </button>
  )
}

/**
 * The dark panel both branches render into.
 *
 * Pins `ink` and `paper` inline so it stays a dark terminal even when the page
 * is in dark mode. One inline style re-themes the whole subtree, which is what
 * the token indirection buys.
 */
const TERMINAL_VARS = { "--color-ink": "#16150f", "--color-paper": "#fdfdfc" } as CSSProperties

function Terminal({ children }: { children: ReactNode }) {
  return (
    <div className="border-line bg-ink overflow-hidden rounded-lg border" style={TERMINAL_VARS}>
      {children}
    </div>
  )
}

const TERMINAL_BUTTON =
  "text-paper rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] transition-colors hover:bg-white/10"

function PromptExport({ prompt, onBack }: { prompt: string; onBack: () => void }) {
  return (
    <div>
      <BackButton onBack={onBack} />
      <Terminal>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <p className="font-mono text-[11px] text-white/45">
            Paste into any agent that can open a link
          </p>
          <CopyText
            value={prompt}
            title="Copy prompt"
            swapOnCopy
            className={cn(TERMINAL_BUTTON, "shrink-0 hover:opacity-100")}
          >
            copy prompt
          </CopyText>
        </div>
        <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-white/85">
          {prompt}
        </pre>
      </Terminal>
      <p className="text-ash mt-3 text-xs leading-relaxed">
        Working with an agent that can't browse the web? Use{" "}
        <span className="text-ink font-medium">Export code</span> instead and paste the tokens
        directly.
      </p>
    </div>
  )
}

function CodeExport({ formats, onBack }: { formats: ExportFormat[]; onBack: () => void }) {
  const [tabId, setTabId] = useState(formats[0]?.id ?? "")
  const active = formats.find((f) => f.id === tabId) ?? formats[0]
  if (!active) return null

  const code = active.render()
  const hasBar = Boolean(active.options || active.fidelity)

  return (
    <div>
      <BackButton onBack={onBack} />
      <Terminal>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-2 sm:py-0">
          {/*
            A select on a phone, tabs on a pointer device.
            
            Scrolling the strip was the first attempt and it was worse: an
            overflow container scrolls both axes, so the row drifted vertically
            as well as sideways. Five formats never fit 375px, and a native
            select hands the whole problem to the OS picker — which is also a
            far better target than a 30px tab.
          */}
          <label className="sr-only" htmlFor="export-format">
            Export format
          </label>
          <select
            id="export-format"
            value={active.id}
            onChange={(e) => setTabId(e.target.value)}
            className="text-paper max-w-[9.5rem] min-w-0 truncate rounded border border-white/15 bg-transparent px-2 py-1.5 font-mono text-base sm:hidden"
          >
            {formats.map((f) => (
              <option key={f.id} value={f.id} className="text-ink bg-paper">
                {f.label}
              </option>
            ))}
          </select>
          <div className="-mb-px hidden min-w-0 sm:flex">
            {formats.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTabId(f.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 font-mono text-xs whitespace-nowrap transition-colors",
                  f.id === active.id ? "text-paper" : "text-white/40 hover:text-white/70",
                )}
              >
                {f.label}
                {f.id === active.id && (
                  <motion.span
                    layoutId="export-tab-underline"
                    className="bg-paper absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    transition={SPRING_PILL}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => download(active, code)}
              title={`Download ${active.filename}`}
              className={cn(TERMINAL_BUTTON, "inline-flex items-center gap-1.5")}
            >
              <DownloadSimple size={12} weight="bold" />
              {/* The word costs ~60px a phone does not have, and the icon plus
                  the title attribute already say it. */}
              <span className="hidden sm:inline">download</span>
            </button>
            {/* cn() inside CopyText resolves the hover-opacity conflict, so the
                plain utility is enough — no `!important` needed. */}
            <CopyText
              value={code}
              title="Copy all"
              swapOnCopy
              className={cn(TERMINAL_BUTTON, "hover:opacity-100")}
            >
              copy
            </CopyText>
          </div>
        </div>

        {hasBar && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2">
            <div className="min-w-0">{active.options}</div>
            {active.fidelity && (
              <TerminalNote summary={active.fidelity.summary} detail={active.fidelity.detail} />
            )}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.pre
            key={`${active.id}-${active.filename}`}
            className="max-h-[60vh] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-white/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.swap, ease: "easeOut" }}
          >
            {code}
          </motion.pre>
        </AnimatePresence>
      </Terminal>
    </div>
  )
}

/**
 * A one-line note in the toolbar that opens into a paragraph.
 *
 * Exported because it isn't only about fidelity: anything in the options bar
 * that needs a sentence of explanation should look and behave identically, and
 * two near-copies of a disclosure drift apart the first time one is touched.
 *
 * Set in the toolbar's own grey rather than a warning colour. Amber read as an
 * error on a tab where nothing is wrong — these notes explain a trade-off you
 * chose, and the loudest thing in the panel shouldn't be a footnote.
 *
 * Collapse for humans, never for machines: the agent payload carries the full
 * report for every target whether or not anyone expanded anything here.
 */
export function TerminalNote({
  summary,
  detail,
}: {
  summary: string
  detail?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!detail) {
    return <p className="font-mono text-[11px] text-white/45">{summary}</p>
  }
  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/45 transition-colors hover:text-white/75"
      >
        {summary}
        <CaretRight
          size={10}
          weight="bold"
          aria-hidden="true"
          className={cn("shrink-0 transition-transform duration-200", open && "rotate-90")}
        />
      </button>
      {open && (
        <div className="mt-1.5 max-w-[60ch] font-sans text-[11px] leading-relaxed text-white/55">
          {detail}
        </div>
      )}
    </div>
  )
}
