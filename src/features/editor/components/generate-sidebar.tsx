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
import { useAgentEnhancePrompt } from "@/features/ai/api/use-agent-enhance-prompt";
import { modelRegistry } from "@/features/agents/models";
import { ImageGenerationModel } from "@/features/agents/types";
import { getModelsByCapability } from "@/features/agents/utils";

interface GenerateSidebarProps {
  editor: Editor | undefined;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

// Action type
type FormAction = {
  type: "UPDATE_FORM";
  field: keyof GenerateState["formData"];
  value: any;
};

// Reducer function
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
  const [model, setModel] = useState<ImageGenerationModel>("r/gpt-image-1");

  const { selectedStyle } = useVisualStyle();

  const [state, dispatch] = useReducer(reducer, INITIAL_GENERATE_STATE);

  const { formData } = state;

  const agentGenerateImage = useAgentGenerateImage();
  const agentEnhancePrompt = useAgentEnhancePrompt();

  // Get model params based on selected model
  const getModelParams = useCallback(() => {
    return (
      modelRegistry.get(model)?.params || {
        quality: ["low", "medium", "high"],
        aspectRatio: ["1:1", "3:2", "2:3"],
      }
    );
  }, [model]);

  const modelParams = getModelParams();

  const handleFormChange = (
    field: keyof GenerateState["formData"],
    value: any,
  ) => {
    dispatch({ type: "UPDATE_FORM", field, value });
  };

  const handleModelChange = (value: ImageGenerationModel) => {
    setModel(value);
    handleFormChange("aspectRatio", "1:1");
    handleFormChange("quality", "high");
  };

  const handleEnhancePrompt = useCallback(async () => {
    if (!formData.prompt || formData.prompt.trim().length === 0) {
      toast.error("Please enter a prompt first");
      return;
    }

    if (formData.prompt.length > 1000) {
      toast.error("Prompt is too long. Please keep it under 1000 characters");
      return;
    }

    try {
      await agentEnhancePrompt.mutateAsync(
        {
          model: "gpt-4.1-mini",
          prompt: formData.prompt,
        },
        {
          onSuccess: ({ data }) => {
            handleFormChange("prompt", data.text);
            toast.success("Prompt enhanced successfully");
          },
          onError: () => {
            toast.error("Failed to enhance prompt");
          },
        },
      );
    } catch (error) {
      console.error("Error enhancing prompt:", error);
    }
  }, [formData.prompt, agentEnhancePrompt]);

  const handleGenerate = useCallback(async () => {
    if (!editor) {
      toast.error("Editor not available");
      return;
    }

    // Get canvas image as base64
    const canvasImage = editor.canvas?.toDataURL({
      format: "png",
      quality: 1,
    });

    // Use the agent-based image generation
    await agentGenerateImage.mutateAsync({
      projectId,
      prompt: formData.prompt,
      style: selectedStyle.id,
      canvasImage: canvasImage,
      model,
      settings: {
        aspectRatio: formData.aspectRatio,
        quality: formData.quality,
        strictness: formData.strictness,
      },
    });
  }, [editor, agentGenerateImage, projectId, formData, selectedStyle, model]);

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
                  onClick={handleEnhancePrompt}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 h-8 text-xs text-primary"
                  disabled={agentEnhancePrompt.isPending}
                >
                  {agentEnhancePrompt.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  <span>Enhance Prompt</span>
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

            {/* Model Selection */}
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

            {/* Sketch Guidance Controls */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sketch Guidance</Label>
              <Select
                value={formData.strictness}
                onValueChange={(value) => handleFormChange("strictness", value)}
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
            {/* Aspect Ratio Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aspect Ratio</Label>
              <Select
                value={formData.aspectRatio}
                onValueChange={(value) =>
                  handleFormChange("aspectRatio", value)
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

            {/* Quality Selection */}
            {modelParams.quality && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quality</Label>
                <Select
                  value={formData.quality}
                  onValueChange={(value) => handleFormChange("quality", value)}
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
            disabled={agentGenerateImage.isPending}
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
