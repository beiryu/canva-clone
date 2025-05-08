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
import { Info, Loader2, Wand2, X } from "lucide-react";
import { motion } from "framer-motion";
import ImageStyles from "./image-styles";
import VisualStylesDrawer from "./visual-styles-drawer";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useGenerateCanvasImage } from "@/features/ai/api/use-generate-canvas-image";
import { useSaveGeneratedImage } from "@/features/projects/api/use-save-generated-image";
import { useQueryClient } from "@tanstack/react-query";
import { useVisualStyle } from "@/features/editor/store/use-visual-style";
import { useAgentGenerateImage } from "@/features/ai/api/use-agent-generate-image";
import { modelRegistry } from "@/features/agents/models";
import {
  ImageAspectRatio,
  ImageGenerationModel,
} from "@/features/agents/types";
import { cacheGenerateImage } from "../utils";
import { getModelsByCapability } from "@/features/agents/utilts";

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
  const [useSeed, setUseSeed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tempImageId, setTempImageId] = useState<string | null>(null);

  const { selectedStyle } = useVisualStyle();

  const [state, dispatch] = useReducer(reducer, INITIAL_GENERATE_STATE);

  const { formData } = state;

  const queryClient = useQueryClient();

  const cache = cacheGenerateImage(queryClient, projectId);

  const generateImage = useGenerateCanvasImage();
  const saveImage = useSaveGeneratedImage(projectId);
  const agentGenerateImage = useAgentGenerateImage();

  // Get model params based on selected model
  const getModelParams = useCallback(() => {
    const model = formData.model as ImageGenerationModel;
    return (
      modelRegistry.get(model)?.params || {
        supportsSeed: true,
        quality: ["low", "medium", "high"],
        aspectRatio: ["1:1", "3:2", "2:3"],
      }
    );
  }, [formData.model]);

  const modelParams = getModelParams();

  const handleFormChange = (
    field: keyof GenerateState["formData"],
    value: any,
  ) => {
    dispatch({ type: "UPDATE_FORM", field, value });
  };

  const handleGenerate = useCallback(async () => {
    if (!editor) {
      toast.error("Editor not available");
      return;
    }

    try {
      setIsGenerating(true);

      // Create a temporary id for the loading image
      const tempId = Date.now().toString();
      setTempImageId(tempId);

      // Add temporary loading image to the cache
      cache.addLoadingImage(tempId, formData, selectedStyle.id);

      // Get canvas image as base64
      const canvasImage = editor.canvas?.toDataURL({
        format: "png",
        quality: 1,
      });

      // Use the agent-based image generation
      const response = await agentGenerateImage.mutateAsync({
        prompt: formData.prompt,
        model: formData.model,
        canvasImage: canvasImage,
        enhancePrompt: formData.enhancePrompt,
        aspectRatio: formData.aspectRatio,
        quality: formData.quality,
        seed: formData.seed,
      });

      // Check if response has data property
      if (
        !response ||
        !("data" in response) ||
        typeof response.data !== "string"
      ) {
        throw new Error("Invalid response from image generation");
      }

      const imageUrl = response.data;

      // Save the generated image
      const savedImageResponse = await saveImage.mutateAsync({
        url: imageUrl,
        prompt: formData.prompt,
        style: selectedStyle.id,
        settings: {
          model: formData.model,
          aspectRatio: formData.aspectRatio,
          quality: formData.quality,
          seed: formData.seed,
        },
      });

      // Update the UI with the new image
      if (savedImageResponse.data) {
        cache.updateImageWithUrl(tempId, imageUrl, savedImageResponse.data.id);
      }

      setIsGenerating(false);
      onClose();
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.");
      if (tempImageId) {
        cache.removeImage(tempImageId);
      }
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editor,
    formData,
    tempImageId,
    agentGenerateImage,
    saveImage,
    cache,
    onClose,
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
                <div className="flex items-center space-x-2">
                  <Label
                    htmlFor="enhance-prompt"
                    className="text-sm text-gray-400 cursor-pointer"
                  >
                    Enhance Prompt
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p className="max-w-xs">
                          Let AI refine your prompt for more creative and
                          detailed images.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Switch
                    id="enhance-prompt"
                    checked={formData.enhancePrompt}
                    onCheckedChange={(value) =>
                      handleFormChange("enhancePrompt", value)
                    }
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary-foreground/50"
                  />
                </div>
              </div>
              <Textarea
                placeholder="Describe the image you want to generate..."
                className="h-32"
                value={formData.prompt}
                onChange={(e) => handleFormChange("prompt", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <div className="flex items-center gap-2">
                <Select
                  value={formData.model}
                  onValueChange={(value) => handleFormChange("model", value)}
                >
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
                          <div className="basis-2/3 flex items-center">
                            <span className="font-medium mr-2">
                              {ratio.label}
                            </span>
                            {ratio.description && (
                              <p className="text-muted-foreground">
                                ({ratio.description})
                              </p>
                            )}
                          </div>
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

            {/* Number of Images Slider */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Number of Images</Label>
                <span className="text-sm">{formData.numImages}</span>
              </div>
              <Slider
                min={1}
                max={4}
                step={1}
                value={[formData.numImages]}
                onValueChange={(value) =>
                  handleFormChange("numImages", value[0])
                }
                className="py-2"
              />
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced" className="border-b-0">
                <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                  Advanced Settings
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 py-2">
                    {/* Seed Option */}
                    {modelParams.supportsSeed && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="use-seed"
                            className="text-sm font-medium"
                          >
                            Use Seed
                          </Label>
                          <Switch
                            id="use-seed"
                            checked={useSeed}
                            onCheckedChange={setUseSeed}
                            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary-foreground/50"
                          />
                        </div>
                        {useSeed && (
                          <div className="px-1">
                            <Input
                              type="number"
                              placeholder="Enter seed (optional)"
                              value={formData.seed}
                              onChange={(e) =>
                                handleFormChange(
                                  "seed",
                                  parseInt(e.target.value),
                                )
                              }
                              className="bg-[#1a1a1a] border-gray-800"
                            />
                            <p className="text-xs text-muted-foreground m-1">
                              Using the same seed produces similar results
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black border-t border-gray-800">
          <Button
            className="w-full"
            size={"lg"}
            effect="gooeyLeft"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            <span className="mr-2">
              {isGenerating ? "Generating..." : "Generate"}
            </span>
          </Button>
        </div>
      </div>

      <VisualStylesDrawer />
    </motion.aside>
  );
};
