"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Download, Loader2 } from "lucide-react";
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

  return (
    <Card className="overflow-hidden bg-black border-card rounded-lg">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-3/4 h-[300px] md:h-[400px]">
          {/* Status indicator */}
          <AnimatePresence>
            {image.id === "id" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-3 left-3 z-10 bg-black/70 text-primary px-3 py-1 rounded-full text-sm font-medium"
              >
                <span className="inline-flex items-center">
                  <span className="mr-4 relative h-2 w-2 flex flex-col items-center justify-center">
                    <span className="ml-4 animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  In progress
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image content */}
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
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="mt-4 text-white/80 text-sm animate-pulse">
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
                        <p className="text-center mt-2 text-sm text-gray-400">
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
                  className={cn(
                    "object-contain rounded-lg",
                    isImageLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoadingComplete={handleImageLoad}
                  priority
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          {image.id !== "id" && (
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={image.id === "id"}
                className={cn(
                  "bg-black/50",
                  image.id === "id" && "opacity-50 cursor-not-allowed",
                )}
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={image.id === "id" || isDownloading}
                onClick={handleDownload}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Prompt, style, settings */}
        <div className="w-full md:w-1/4 p-4 bg-[#0a0a0a] flex flex-col justify-between">
          {/* Prompt */}
          <div className="space-y-3">
            {image.prompt && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Prompt</p>
                <p
                  className="text-sm text-gray-300 line-clamp-6 cursor-pointer hover:text-primary transition-colors"
                  onClick={handleCopyPrompt}
                  title="Click to copy prompt"
                >
                  {image.prompt}
                </p>
              </div>
            )}

            {/* Style */}
            {style && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Visual Style</p>
                <div className="flex items-center space-x-2">
                  <Image
                    src={style.image}
                    alt={style.name}
                    width={50}
                    height={50}
                    className="rounded-md"
                  />
                  <span className="text-sm font-medium text-primary">
                    {style.name}
                  </span>
                </div>
              </div>
            )}

            {/* Model */}
            {getModelDisplayName(image.model) && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Model</p>
                <p className="text-xs text-gray-400">
                  {getModelDisplayName(image.model)}
                </p>
              </div>
            )}

            {/* Settings */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Settings</p>
              <div className="space-y-1">
                {image.settings.aspectRatio && (
                  <p className="text-xs text-gray-400">
                    Aspect Ratio: {image.settings.aspectRatio}
                  </p>
                )}
                {image.settings.quality && (
                  <p className="text-xs text-gray-400">
                    Quality: {image.settings.quality}
                  </p>
                )}
                {image.settings.strictness && (
                  <p className="text-xs text-gray-400">
                    Strictness: {image.settings.strictness}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {new Date(image.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
