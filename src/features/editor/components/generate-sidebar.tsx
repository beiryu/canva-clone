import { Editor } from "@/features/editor/types";
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
import { Info, Wand2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface GenerateSidebarProps {
  editor: Editor | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const models = [
  {
    value: "higgsfield",
    label: "Higgsfield",
    description: "Standard speed, standard queue",
  },
  {
    value: "gpt",
    label: "GPT Image",
    description: "Faster speed, priority queue",
  },
];

const dimensionOptions = [
  { value: "1:1", label: "Square - 1024×1024" },
  { value: "16:9", label: "Landscape - 1792×1024" },
  { value: "9:16", label: "Portrait - 1024×1792" },
  { value: "4:3", label: "Standard - 1344×1024" },
  { value: "3:4", label: "Standard Portrait - 1024×1344" },
];

const qualityOptions = [
  { value: "standard", label: "Standard" },
  { value: "hd", label: "HD" },
];

export const GenerateSidebar = ({
  editor,
  isOpen,
  onClose,
}: GenerateSidebarProps) => {
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [useSeed, setUseSeed] = useState(false);

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
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Generate</h2>
          <p className="text-sm text-muted-foreground">
            Generate images using AI
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          className="h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
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
                        Let AI refine your prompt for more creative and detailed
                        images.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Switch
                  id="enhance-prompt"
                  checked={enhancePrompt}
                  onCheckedChange={setEnhancePrompt}
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary-foreground/50"
                />
              </div>
            </div>
            <Textarea
              placeholder="Describe the image you want to generate..."
              className="h-32"
              defaultValue="Artistic background with multiple overlapping characters, in an abstract or semi-abstract style. The characters are stylized, with vibrant colors and creative composition, creating a sense of movement and depth. Soft, blended"
            />
          </div>

          {/* Negative Prompt - Now enabled */}
          {/* <div className="space-y-2">
                <Label htmlFor="negative-prompt" className="text-sm font-medium">
                  Negative Prompt
                </Label>
                <Textarea
                  id="negative-prompt"
                  className="bg-[#1a1a1a] border-gray-800 resize-none h-16"
                  placeholder="e.g., blurry, text, watermark, ugly, deformed"
                />
              </div> */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <div className="flex items-center gap-2">
              <Select defaultValue="gpt">
                <SelectTrigger className="bg-muted border h-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-black p-4 rounded-xl">
                  <div className="px-2 pb-2 text-muted-foreground text-sm font-medium">
                    Select model
                  </div>
                  <div className="flex flex-col gap-2">
                    {models.map((model) => (
                      <SelectItem
                        key={model.value}
                        value={model.value}
                        className={cn(
                          "group flex items-center gap-4 rounded-lg px-4 py-3",
                          "data-[state=checked]:border data-[state=checked]:border-accent",
                        )}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="flex flex-col flex-1 items-start">
                            <span className="font-medium">{model.label}</span>
                            <span className="text-xs font-light italic">
                              {model.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dimensions Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Dimensions</Label>
            <Select defaultValue="1:1">
              <SelectTrigger className="bg-muted border">
                <SelectValue placeholder="Select dimensions" />
              </SelectTrigger>
              <SelectContent className="bg-black">
                {dimensionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quality</Label>
            <Select defaultValue="standard">
              <SelectTrigger className="bg-muted border">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent className="bg-black">
                {qualityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of Images Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm font-medium">Number of Images</Label>
              <span className="text-sm">{numImages}</span>
            </div>
            <Slider
              min={1}
              max={4}
              step={1}
              value={[numImages]}
              onValueChange={(value) => setNumImages(value[0])}
              className="py-2"
            />
          </div>

          {/* Advanced Settings */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                Advanced Settings
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 py-2">
                  {/* Seed Option */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="use-seed" className="text-sm font-medium">
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
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          className="bg-[#1a1a1a] border-gray-800"
                        />
                        <p className="text-xs text-muted-foreground m-1">
                          Using the same seed produces similar results
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button className="w-full" size={"lg"} effect="gooeyLeft">
            <Wand2 className="h-4 w-4 mr-2" />
            <span className="mr-2">Generate</span>
          </Button>
        </div>
      </ScrollArea>

      <VisualStylesDrawer />
    </motion.aside>
  );
};
