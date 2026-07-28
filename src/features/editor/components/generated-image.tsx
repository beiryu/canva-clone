"use client";

import { Loader } from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { useProjectGeneratedImages } from "@/features/projects/api/use-project-generated-images";

interface GeneratedImageProps {
  projectId: string;
}

export const GeneratedImage = ({ projectId }: GeneratedImageProps) => {
  const { data: images, isLoading } = useProjectGeneratedImages(projectId);

  if (isLoading) {
    return (
      <main className="bg-black text-white p-4 md:p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col gap-y-4 items-center justify-center h-32">
            <Loader className="size-6 animate-spin text-muted-foreground" />
          </div>
          <p>Loading generated images</p>
        </div>
      </main>
    );
  }

  if (!images || images.length === 0) {
    return (
      <main className="bg-black text-white p-4 md:p-8 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <h3 className="text-xl font-semibold mb-2">
            No generated images yet
          </h3>
          <p className="text-gray-400">
            Use the Generate panel to create images from your canvas design
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black text-white p-4 md:p-6 h-full">
      <div className="max-w-[1600px] mx-auto">
        <ImageGallery images={images} />
      </div>
    </main>
  );
};
