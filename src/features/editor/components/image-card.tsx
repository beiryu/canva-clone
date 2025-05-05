"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  RefreshCcw,
  Settings,
  EyeOff,
  Trash2,
  Edit,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCardProps {
  image: any;
  onDelete: () => void;
  onRerun: () => void;
}

export function ImageCard({ image, onDelete, onRerun }: ImageCardProps) {
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

          {image.status === "success" && (
            <Image
              src={image.imageUrl || "/placeholder.svg"}
              alt={image.prompt || "Generated image"}
              fill
              className="object-cover"
            />
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
                onClick={onDelete}
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
                onClick={onRerun}
                disabled={image.status === "loading"}
                className={cn(
                  "bg-black/50",
                  image.status === "loading" && "opacity-50 cursor-not-allowed",
                )}
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="secondary" size="sm" className="bg-black/50">
                <Settings className="h-4 w-4" />
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

        {/* Prompt and thumbnail */}
        <div className="w-full md:w-1/4 p-4 bg-[#0a0a0a] flex flex-col justify-between">
          <p className="text-sm text-gray-300 mb-4 line-clamp-[12]">
            {image.prompt}
          </p>

          {image.thumbnailUrl && (
            <div className="self-end">
              <Image
                src={image.thumbnailUrl || "/placeholder.svg"}
                alt="Thumbnail"
                width={60}
                height={60}
                className="rounded-md border border-gray-700"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
