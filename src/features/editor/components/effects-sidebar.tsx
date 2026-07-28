import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_TEXT_EFFECT_OPTIONS,
  Editor,
  TEXT_EFFECT_CONTROL_LABELS,
  TEXT_EFFECT_CONTROLS,
  TEXT_EFFECT_PRESETS,
  TEXT_EFFECT_SLIDER_META,
  TextEffect,
  TextEffectOptions,
} from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ColorPicker } from "@/features/editor/components/color-picker";

import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EffectsSidebarProps {
  editor: Editor | undefined;
  isOpen: boolean;
  onClose: () => void;
}

type AppliedEffect = Exclude<TextEffect, "none">;

/** Glow, Outline and Splice are deliberately absent until they're implemented. */
const EFFECTS: { value: TextEffect; label: string }[] = [
  { value: "none", label: "None" },
  { value: "drop", label: "Drop" },
  { value: "echo", label: "Echo" },
  { value: "background", label: "Background" },
];

/** A miniature "Ag" preview per tile, styled to hint at the effect. */
const TilePreview = ({ effect }: { effect: TextEffect }) => {
  const base = "text-3xl font-bold text-primary";

  if (effect === "drop") {
    return (
      <span className={base} style={{ textShadow: "3px 3px 4px #00000080" }}>
        Ag
      </span>
    );
  }

  if (effect === "echo") {
    return (
      <span
        className={base}
        style={{ textShadow: "3px 3px 0 #00000040, 6px 6px 0 #00000020" }}
      >
        Ag
      </span>
    );
  }

  if (effect === "background") {
    return (
      <span className="rounded-md bg-primary px-2 text-3xl font-bold text-black">
        Ag
      </span>
    );
  }

  return <span className={cn(base, "text-muted-foreground")}>Ag</span>;
};

export const EffectsSidebar = ({
  editor,
  isOpen,
  onClose,
}: EffectsSidebarProps) => {
  const selectedObject = useMemo(
    () => editor?.selectedObjects[0],
    [editor?.selectedObjects],
  );

  const [effect, setEffect] = useState<TextEffect>("none");
  const [options, setOptions] = useState<TextEffectOptions>(
    DEFAULT_TEXT_EFFECT_OPTIONS,
  );
  // Drafts are kept PER EFFECT: switching Drop -> Echo -> Drop still restores
  // the offset you dialled in, but the first time you pick an effect you get
  // that effect's own sensible starting point rather than one flat set of values
  // that suits none of the three.
  const [drafts, setDrafts] = useState<
    Partial<Record<AppliedEffect, TextEffectOptions>>
  >({});

  // Reflect whatever is selected, so reopening the panel on an object that
  // already has an effect shows its real values instead of the defaults.
  useEffect(() => {
    if (!selectedObject) return;

    const active = editor?.getActiveTextEffect();

    if (active) {
      setEffect(active.effect);
      setOptions(active.options);

      if (active.effect !== "none") {
        setDrafts((current) => ({
          ...current,
          [active.effect]: active.options,
        }));
      }
    }
    // getActiveTextEffect reads from selectedObjects, so that is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObject]);

  const applyEffect = (next: TextEffect) => {
    setEffect(next);

    if (next === "none") {
      editor?.changeTextEffect(next, options);
      return;
    }

    const seed = drafts[next] ?? TEXT_EFFECT_PRESETS[next];

    setOptions(seed);
    setDrafts((current) => ({ ...current, [next]: seed }));
    editor?.changeTextEffect(next, seed);
  };

  /**
   * `commit` gates the undo history: sliders fire on every tick, so only the
   * final value on release pushes an entry.
   */
  const applyOption = <K extends keyof TextEffectOptions>(
    key: K,
    value: TextEffectOptions[K],
    commit = true,
  ) => {
    const nextOptions = { ...options, [key]: value };
    setOptions(nextOptions);

    if (effect === "none") return;

    setDrafts((current) => ({ ...current, [effect]: nextOptions }));
    editor?.changeTextEffect(effect, nextOptions, commit);
  };

  const controls = effect === "none" ? [] : TEXT_EFFECT_CONTROLS[effect];

  return (
    <aside
      className={cn(
        "bg-black relative border-r z-[40] w-[360px] h-full flex flex-col",
        isOpen ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Effects"
        description="Add an effect to the selected text"
      />
      <ScrollArea>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {EFFECTS.map((item) => (
              <button
                key={item.value}
                onClick={() => applyEffect(item.value)}
                aria-pressed={effect === item.value}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "flex h-20 w-full items-center justify-center rounded-lg border bg-muted/10 transition",
                    effect === item.value
                      ? "ring-2 ring-primary border-primary"
                      : "hover:bg-muted/20",
                  )}
                >
                  <TilePreview effect={item.value} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {controls.map((key) => {
            const label = TEXT_EFFECT_CONTROL_LABELS[key];

            // Returning here narrows `key` to a slider key for the rest of the
            // block, which is why colour is not in TEXT_EFFECT_SLIDER_META.
            if (key === "color") {
              return (
                <div key={key} className="space-y-2">
                  <span className="text-sm font-medium">{label}</span>
                  <ColorPicker
                    value={options.color}
                    onChange={(value) => applyOption("color", value)}
                  />
                </div>
              );
            }

            const meta = TEXT_EFFECT_SLIDER_META[key];

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {options[key]}
                    {meta.unit}
                  </span>
                </div>
                <Slider
                  value={[options[key] as number]}
                  // Live while dragging, but only the committed value on release
                  // becomes an undo step.
                  onValueChange={(values) => applyOption(key, values[0], false)}
                  onValueCommit={(values) => applyOption(key, values[0], true)}
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
