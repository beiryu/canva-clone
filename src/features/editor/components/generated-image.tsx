"use client";

import { Loader } from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { useProjectGeneratedImages } from "@/features/projects/api/use-project-generated-images";

interface GeneratedImageProps {
  projectId: string;
}

export default function GeneratedImage({ projectId }: GeneratedImageProps) {
  const { data: fetchedImages, isLoading } =
    useProjectGeneratedImages(projectId);

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

  if (!fetchedImages || fetchedImages.length === 0) {
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

  // TODO: Map 1-1 with database
  // Format images for the gallery
  const formattedImages = fetchedImages.map((image: any) => ({
    id: image.id,
    status:
      "status" in image && image.status === "loading" ? "loading" : "success",
    prompt: image.prompt,
    thumbnailUrl: image.url,
    imageUrl: image.url,
    createdAt: new Date(image.createdAt).toLocaleString(),
  }));

  return (
    <main className="bg-black text-white p-4 md:p-8 h-full">
      <div className="max-w-6xl mx-auto">
        <ImageGallery images={formattedImages} />
      </div>
    </main>
  );
}
