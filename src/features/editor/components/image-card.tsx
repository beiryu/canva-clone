"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { visualStyles } from "../store/use-visual-style";
import { getModelDisplayName } from "@/features/agents/utils";
import { getImageUrl } from "@/features/images/utils";
import { useImageDownload } from "@/features/images/hooks/use-image-download";
import { useImageLoading } from "@/features/editor/hooks/use-image-loading";
import { motion, AnimatePresence } from "framer-motion";

interface ImageCardProps {
  image: any;
}

export function ImageCard({ image }: ImageCardProps) {
  const style = visualStyles.find((style) => style.id === image.style);

  const {
    isLoading: isImageLoading,
    progress: imageLoadProgress,
    handleImageLoad,
  } = useImageLoading();

  const imageUrl = getImageUrl(image.fullPath);

  const { downloadImage, isDownloading } = useImageDownload();

  const handleDownload = () => {
    downloadImage(imageUrl, `SketchpadAI-${Date.now()}.webp`);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt);
    toast.success("Prompt copied to clipboard");
  };

  const metaItems = [
    getModelDisplayName(image.model),
    image.settings?.aspectRatio,
    image.settings?.quality,
    image.settings?.strictness && `Strictness: ${image.settings.strictness}`,
  ].filter(Boolean) as string[];

  return (
    <Card className="overflow-hidden bg-black border-card rounded-lg">
      <div className="flex flex-col">
        <div className="relative w-full h-[240px]">
          <AnimatePresence>
            {image.id === "id" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 left-2 z-10 bg-black/70 text-primary px-2 py-0.5 rounded-full text-xs font-medium"
              >
                <span className="inline-flex items-center">
                  <span className="mr-3 relative h-2 w-2 flex flex-col items-center justify-center">
                    <span className="ml-3 animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  In progress
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {image.id === "id" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full bg-gradient-to-r from-[#8a5a5a] to-[#8a7a5a] rounded-lg"
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 relative">
                    <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-3 text-white/80 text-xs animate-pulse">
                    Generating your masterpiece...
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="loaded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full transition-opacity duration-300 ease-in-out rounded-lg"
              >
                {isImageLoading && (
                  <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-black/70 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-full max-w-[80%] mb-4">
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: `${imageLoadProgress}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                          />
                        </div>
                        <p className="text-center mt-2 text-xs text-gray-400">
                          Loading image... {Math.round(imageLoadProgress)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <Image
                  src={imageUrl}
                  alt={image.prompt || "Generated image"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  className={cn(
                    "object-contain rounded-lg",
                    isImageLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoadingComplete={handleImageLoad}
                  loading="lazy"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {image.id !== "id" && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button
                variant="default"
                size="icon"
                className="h-7 w-7"
                disabled={image.id === "id" || isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="w-full p-3 bg-[#0a0a0a] space-y-2">
          {image.prompt && (
            <p
              className="text-xs text-gray-300 line-clamp-2 cursor-pointer hover:text-primary transition-colors"
              onClick={handleCopyPrompt}
              title="Click to copy prompt"
            >
              {image.prompt}
            </p>
          )}

          {style && (
            <div className="flex items-center gap-2">
              <Image
                src={style.image}
                alt={style.name}
                width={24}
                height={24}
                className="rounded shrink-0"
              />
              <span className="text-xs font-medium text-primary truncate">
                {style.name}
              </span>
            </div>
          )}

          {metaItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500">
              {metaItems.map((item, index) => (
                <span
                  key={`${index}-${item}`}
                  className="inline-flex items-center gap-x-1.5"
                >
                  {index > 0 && <span aria-hidden>·</span>}
                  {item}
                </span>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-600">
            {new Date(image.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
