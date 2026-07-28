import { useCallback, useReducer } from "react";
import {
  ASPECT_RATIO_OPTIONS,
  Editor,
  GenerateState,
  INITIAL_GENERATE_STATE,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, Wand2, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ImageStyles from "./image-styles";
import VisualStylesDrawer from "./visual-styles-drawer";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { useVisualStyle } from "@/features/editor/store/use-visual-style";
import { useAgentGenerateImage } from "@/features/ai/api/use-agent-generate-image";
import { useAutoPrompt } from "@/features/ai/api/use-auto-prompt";
import { DEFAULT_IMAGE_MODEL } from "@/features/agents/model-ids";
import { modelRegistry } from "@/features/agents/models";
import {
  ImageAspectRatio,
  ImageGenerationModel,
  ImageQuality,
  SketchGuidanceStrictness,
} from "@/features/agents/types";
import { getModelsByCapability } from "@/features/agents/utils";

interface GenerateSidebarProps {
  editor: Editor | undefined;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

type FormAction =
  | {
      type: "UPDATE_FORM";
      field: keyof GenerateState["formData"];
      value: any;
    }
  | {
      type: "PATCH_FORM";
      patch: Partial<GenerateState["formData"]>;
    };

/**
 * Longest edge, in px, of the canvas snapshot sent to the auto-prompt model.
 * Measured: 512px costs 226 input tokens vs 408 at 768px, with no drop in
 * prompt quality.
 */
const AUTO_PROMPT_MAX_EDGE = 512;

const reducer = (state: GenerateState, action: FormAction): GenerateState => {
  switch (action.type) {
    case "UPDATE_FORM":
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value,
        },
      };
    case "PATCH_FORM":
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.patch,
        },
      };
    default:
      return state;
  }
};

export const GenerateSidebar = ({
  editor,
  isOpen,
  onClose,
  projectId,
}: GenerateSidebarProps) => {
  const [model, setModel] = useState<ImageGenerationModel>(DEFAULT_IMAGE_MODEL);

  const { selectedStyle } = useVisualStyle();

  const [state, dispatch] = useReducer(reducer, INITIAL_GENERATE_STATE);

  const { formData } = state;

  const agentGenerateImage = useAgentGenerateImage();
  const autoPrompt = useAutoPrompt();

  const getModelParams = useCallback(() => {
    return modelRegistry.get(model)?.params ?? {};
  }, [model]);

  const modelParams = getModelParams();

  const handleFormChange = <K extends keyof GenerateState["formData"]>(
    field: K,
    value: GenerateState["formData"][K],
  ) => {
    dispatch({ type: "UPDATE_FORM", field, value });
  };

  // Keep the user's existing choices when the incoming model supports them, and
  // only fall back when it does not. Resetting unconditionally would discard a
  // deliberate aspect-ratio pick on every model switch, and would set a quality
  // value on models that have no quality control at all.
  const handleModelChange = (next: ImageGenerationModel) => {
    const params = modelRegistry.get(next)?.params ?? {};
    const patch: Partial<GenerateState["formData"]> = {};

    const ratios = params.aspectRatio ?? [];
    if (ratios.length && !ratios.includes(formData.aspectRatio)) {
      patch.aspectRatio = (ratios[0] as ImageAspectRatio) ?? "1:1";
    }

    if (params.quality?.length && !params.quality.includes(formData.quality)) {
      patch.quality = params.quality[0] as ImageQuality;
    }

    setModel(next);
    if (Object.keys(patch).length) {
      dispatch({ type: "PATCH_FORM", patch });
    }
  };

  const handleAutoPrompt = useCallback(async () => {
    if (!editor) {
      toast.error("Editor not available");
      return;
    }

    // Same emptiness test handleGenerate uses — "clip" is the workspace rect,
    // so a canvas holding only that has nothing drawn on it. Sending it would
    // just bill a request to describe a blank rectangle.
    const hasSketch = (editor.canvas?.getObjects() ?? []).some(
      (object) => object.name !== "clip",
    );

    if (!hasSketch) {
      toast.error("Draw something on the canvas first");
      return;
    }

    // A downscaled JPEG, not the full-res PNG handleGenerate sends: at 768px
    // the model cost 1.8x the input tokens for no measurable gain in prompt
    // quality. This capture is throwaway input, never persisted.
    const longestEdge = Math.max(
      editor.canvas?.getWidth() ?? AUTO_PROMPT_MAX_EDGE,
      editor.canvas?.getHeight() ?? AUTO_PROMPT_MAX_EDGE,
    );

    const canvasImage = editor.canvas?.toDataURL({
      format: "jpeg",
      quality: 0.8,
      multiplier: Math.min(1, AUTO_PROMPT_MAX_EDGE / longestEdge),
    });

    if (!canvasImage) {
      toast.error("Could not read the canvas");
      return;
    }

    try {
      await autoPrompt.mutateAsync(
        {
          // Model choice is the server's default.
          canvasImage,
          // Whatever is already typed becomes topic context rather than being
          // replaced blindly.
          prompt: formData.prompt || undefined,
          // The id is what the server resolves guidance from; the name is only
          // a fallback label for built-in styles, which have no database row.
          style: selectedStyle.id,
          styleName: selectedStyle.name,
        },
        {
          onSuccess: ({ data }) => {
            handleFormChange("prompt", data.text);
            toast.success("Prompt written from your canvas");
          },
          onError: () => {
            toast.error("Failed to write a prompt");
          },
        },
      );
    } catch (error) {
      console.error("Error writing auto prompt:", error);
    }
    // selectedStyle is a real dependency, not decoration: omit it and switching
    // style then hitting Auto Prompt sends the previously selected one.
  }, [editor, formData.prompt, autoPrompt, selectedStyle]);

  const handleGenerate = useCallback(async () => {
    if (!editor) {
      toast.error("Editor not available");
      return;
    }

    // Only capture the canvas when the model can actually consume it, and only
    // when something has been drawn. An untouched canvas still serialises to a
    // valid image — the flat workspace fill — which a sketch model would
    // faithfully treat as a blueprint. "clip" is the workspace rect itself.
    const hasSketch = (editor.canvas?.getObjects() ?? []).some(
      (object) => object.name !== "clip",
    );

    const canvasImage =
      modelParams.supportsImageInput && hasSketch
        ? editor.canvas?.toDataURL({ format: "png", quality: 1 })
        : undefined;

    await agentGenerateImage.mutateAsync({
      projectId,
      prompt: formData.prompt,
      style: selectedStyle.id,
      canvasImage,
      model,
      settings: {
        aspectRatio: formData.aspectRatio,
        ...(modelParams.quality ? { quality: formData.quality } : {}),
        ...(modelParams.supportsImageInput
          ? { strictness: formData.strictness }
          : {}),
      },
    });
  }, [
    editor,
    agentGenerateImage,
    projectId,
    formData,
    selectedStyle,
    model,
    modelParams,
  ]);

  return (
    <motion.aside
      className={cn(
        "bg-black border-l z-[10] w-[420px] h-full flex flex-col",
        isOpen ? "block" : "hidden",
      )}
      initial={{ width: 0, opacity: 0 }}
      animate={{
        width: isOpen ? 420 : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <h2 className="text-lg font-semibold">Generate</h2>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          className="h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex flex-col h-[calc(100%-56px)] relative">
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4 pb-24">
            <ImageStyles />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="prompt" className="text-sm font-medium">
                  Prompt
                </Label>
                <Button
                  onClick={handleAutoPrompt}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8 text-xs text-primary"
                  disabled={autoPrompt.isPending}
                  title="Write a thumbnail prompt from what's on the canvas"
                >
                  {autoPrompt.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>Auto Prompt</span>
                </Button>
              </div>
              <Textarea
                placeholder="Describe the image you want to generate..."
                className="h-32"
                value={formData.prompt}
                onChange={(e) => handleFormChange("prompt", e.target.value)}
              />
              <div className="text-xs text-muted-foreground text-right">
                {formData.prompt.length}/1000 characters
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <div className="flex items-center gap-2">
                <Select value={model} onValueChange={handleModelChange}>
                  <SelectTrigger className="bg-muted border h-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-black p-4 rounded-xl">
                    <div className="px-2 pb-2 text-muted-foreground text-sm font-medium">
                      Select model
                    </div>
                    <div className="flex flex-col gap-2">
                      {getModelsByCapability("image-generation").map(
                        (model) => (
                          <SelectItem
                            key={model.id}
                            value={model.id!}
                            className={cn(
                              "group flex items-center gap-4 rounded-lg px-4 py-3",
                            )}
                          >
                            <div className="flex items-center gap-4 w-full">
                              <div className="flex flex-col flex-1 items-start">
                                <span className="font-medium">
                                  {model.name}
                                </span>
                                <span className="text-xs font-light italic">
                                  {model.description}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {modelParams.supportsImageInput && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sketch Guidance</Label>
                <Select
                  value={formData.strictness}
                  onValueChange={(value) =>
                    handleFormChange(
                      "strictness",
                      value as SketchGuidanceStrictness,
                    )
                  }
                >
                  <SelectTrigger className="bg-muted border">
                    <SelectValue placeholder="Select guidance level" />
                  </SelectTrigger>
                  <SelectContent className="bg-black p-4 rounded-xl">
                    <div className="px-2 pb-2 text-muted-foreground text-sm font-medium">
                      Select level
                    </div>
                    <div className="flex flex-col gap-2">
                      <SelectItem
                        value="loose"
                        className="group flex items-center gap-4 rounded-lg px-4 py-2"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-medium mr-2">Loose</span>
                          <p className="text-muted-foreground">
                            (Creative interpretation)
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="moderate"
                        className="group flex items-center gap-4 rounded-lg px-4 py-2"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-medium mr-2">Moderate</span>
                          <p className="text-muted-foreground">
                            (Follow general layout)
                          </p>
                        </div>
                      </SelectItem>
                      <SelectItem
                        value="strict"
                        className="group flex items-center gap-4 rounded-lg px-4 py-2"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-medium mr-2">Strict</span>
                          <p className="text-muted-foreground">
                            (Follow sketch exactly)
                          </p>
                        </div>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <Select
                value={formData.aspectRatio}
                onValueChange={(value) =>
                  handleFormChange("aspectRatio", value as ImageAspectRatio)
                }
              >
                <SelectTrigger className="bg-muted border">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent className="bg-black p-4 rounded-xl">
                  <div className="px-2 pb-2 text-muted-foreground text-sm font-medium">
                    Select aspect ratio
                  </div>
                  <div className="flex flex-col gap-2">
                    {ASPECT_RATIO_OPTIONS.filter((ratio) =>
                      modelParams.aspectRatio?.includes(ratio.value),
                    ).map((ratio) => (
                      <SelectItem
                        key={ratio.value}
                        value={ratio.value}
                        className={cn(
                          "group flex items-center gap-4 rounded-lg px-4 py-2",
                        )}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <span className="font-medium mr-2">
                            {ratio.label}
                          </span>
                          {ratio.description && (
                            <p className="text-muted-foreground">
                              ({ratio.description})
                            </p>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {modelParams.quality && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quality</Label>
                <Select
                  value={formData.quality}
                  onValueChange={(value) =>
                    handleFormChange("quality", value as ImageQuality)
                  }
                >
                  <SelectTrigger className="bg-muted border">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent className="bg-black p-4 rounded-xl">
                    <div className="px-2 pb-2 text-muted-foreground text-sm font-medium">
                      Select quality
                    </div>
                    {modelParams.quality?.map((option: string) => (
                      <SelectItem
                        key={option}
                        value={option}
                        className={cn(
                          "group flex items-center gap-4 rounded-lg px-4 py-2",
                        )}
                      >
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black border-t border-gray-800">
          <Button
            className="w-full"
            size={"lg"}
            effect="gooeyLeft"
            onClick={handleGenerate}
            // The prompt now starts empty, so guard the blank case here rather
            // than letting the server's min(1) come back as a generic 400.
            disabled={agentGenerateImage.isPending || !formData.prompt.trim()}
          >
            {agentGenerateImage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            <span className="mr-2">
              {agentGenerateImage.isPending ? "Generating..." : "Generate"}
            </span>
          </Button>
        </div>
      </div>

      <VisualStylesDrawer />
    </motion.aside>
  );
};
