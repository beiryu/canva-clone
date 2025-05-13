import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Paintbrush } from "lucide-react";
import { useVisualStyle } from "@/features/editor/store/use-visual-style";

export default function ImageStyles() {
  const { selectedStyle, setIsStyleDrawerOpen } = useVisualStyle();

  return (
    <div className="relative rounded-lg overflow-hidden">
      <Image
        src={selectedStyle.image}
        alt="Preview image"
        width={200}
        height={200}
        className="w-full h-60 object-cover"
        style={{ objectPosition: "0 0" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 flex flex-col justify-end p-4">
        <h3 className="text-xl font-bold text-yellow-300 uppercase">
          {selectedStyle.name}
        </h3>
        <Button
          variant="default"
          size="sm"
          className="absolute top-2 right-2 border-primary"
          onClick={() => setIsStyleDrawerOpen(true)}
        >
          <Paintbrush className="h-4 w-4 mr-1" /> Change
        </Button>
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          Style Applied
        </div>
      </div>
    </div>
  );
}
