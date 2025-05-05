import { ActiveTool, Editor } from "@/features/editor/types";
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
import ImageStyles from "./image-styles";
import VisualStylesDrawer from "./visual-styles-drawer";
import { useStyleStore } from "@/store/style-store";

interface GenerateSidebarProps {
  editor: Editor | undefined;
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

export const GenerateSidebar = ({ editor }: GenerateSidebarProps) => {
  return (
    <aside
      className={cn(
        "bg-black relative border-l z-[40] w-[420px] h-full flex flex-col",
      )}
    >
      <ScrollArea>
        <div className="p-4 space-y-4">
          <ImageStyles />
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea
              placeholder="Describe the image you want to generate..."
              className="h-32"
              defaultValue="Artistic background with multiple overlapping characters, in an abstract or semi-abstract style. The characters are stylized, with vibrant colors and creative composition, creating a sense of movement and depth. Soft, blended"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <div className="flex items-center gap-2">
              <Select defaultValue="gpt">
                <SelectTrigger className="bg-muted border h-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-black w-[350px] p-4 rounded-xl">
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
          <Button className="w-full" size={"lg"}>
            <span className="mr-2">+</span> Generate
          </Button>
        </div>
      </ScrollArea>

      <VisualStylesDrawer />
    </aside>
  );
};
