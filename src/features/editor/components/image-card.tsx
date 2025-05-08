"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EyeOff, Trash2, Edit, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { visualStyles } from "../store/use-visual-style";

interface ImageCardProps {
  image: any;
}

export function ImageCard({ image }: ImageCardProps) {
  const style = visualStyles.find((style) => style.id === image.style);

  return (
    <Card className="overflow-hidden bg-black border-card rounded-lg">
      <div className="flex flex-col md:flex-row">
        <div className="relative w-full md:w-3/4 h-[300px] md:h-[400px]">
          {/* Status indicator */}
          {image.status === "loading" && (
            <div className="absolute top-3 left-3 z-10 bg-black/70 text-primary px-3 py-1 rounded-full text-sm font-medium">
              In progress
            </div>
          )}

          {/* Image content */}
          {image.status === "loading" && (
            <div className="w-full h-full bg-gradient-to-r from-[#8a5a5a] to-[#8a7a5a] animate-pulse">
              <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          )}

          {/* TODO: Add image status = success */}
          {!image.status && (
            <div className="w-full h-full transition-opacity duration-300 ease-in-out">
              <Image
                src={image.url || "/placeholder.svg"}
                alt={image.prompt || "Generated image"}
                fill
                className="object-contain"
              />
            </div>
          )}

          {image.status === "error" && (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-6 text-center">
              <EyeOff className="w-12 h-12 mb-4 text-muted-foreground" />
              <h3 className="text-xl font-bold mb-2">Whoops!</h3>
              <p className="text-muted-foreground mb-6">
                {image.errorMessage ||
                  "An error occurred while generating this image."}
              </p>
              <Button
                variant="destructive"
                size="sm"
                // onClick={onDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {image.status !== "error" && (
            <div className="absolute bottom-3 right-3 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={image.status === "loading"}
                className={cn(
                  "bg-black/50",
                  image.status === "loading" && "opacity-50 cursor-not-allowed",
                )}
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={image.status === "loading"}
              >
                <Download className="h-4 w-4" />
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
                <p className="text-sm text-gray-300 line-clamp-6">
                  {image.prompt}
                </p>
              </div>
            )}

            {/* Style */}
            {style && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Style</p>
                <Image
                  src={style.image}
                  alt={style.name}
                  width={50}
                  height={50}
                  className="rounded-md"
                />
              </div>
            )}

            {/* Settings */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Settings</p>
              <div className="space-y-1">
                {image.settings.model && (
                  <p className="text-xs text-gray-400">
                    Model: {image.settings.model}
                  </p>
                )}
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
                {image.settings.seed !== undefined && (
                  <p className="text-xs text-gray-400">
                    Seed: {image.settings.seed}
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
