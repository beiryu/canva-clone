"use client";

import { useState } from "react";
import { ImageGallery } from "./image-gallery";

// Sample data for demonstration
const initialImages: any[] = [
  {
    id: "1",
    status: "loading",
    prompt:
      "Artistic background with multiple overlapping characters, in an abstract or semi-abstract style. The characters are stylized, with vibrant colors and creative composition, creating a sense of movement and depth.",
    thumbnailUrl: "/placeholder.svg?height=80&width=80",
    imageUrl: "/placeholder.svg?height=500&width=800",
  },
  {
    id: "2",
    status: "error",
    prompt:
      "Artistic background with multiple overlapping characters, in an abstract or semi-abstract style. The characters are stylized, with vibrant colors and creative composition, creating a sense of movement and depth.",
    thumbnailUrl: "/placeholder.svg?height=80&width=80",
    imageUrl: "/placeholder.svg?height=500&width=800",
    errorMessage:
      "Looks like this content may go against our guidelines. Let's try something different!",
  },
  {
    id: "3",
    status: "success",
    prompt:
      "A serene landscape with mountains in the background, a calm lake reflecting the sky, and a small cabin nestled among pine trees.",
    thumbnailUrl: "/placeholder.svg?height=80&width=80",
    imageUrl: "/placeholder.svg?height=500&width=800",
  },
];

export default function GeneratedImage() {
  const [images, setImages] = useState<any[]>(initialImages);

  const handleDelete = (id: string) => {
    setImages(images.filter((image) => image.id !== id));
  };

  const handleRerun = (id: string) => {
    setImages(
      images.map((image) =>
        image.id === id ? { ...image, status: "loading" } : image,
      ),
    );

    // Simulate completion after 3 seconds
    setTimeout(() => {
      setImages(
        images.map((image) =>
          image.id === id ? { ...image, status: "success" } : image,
        ),
      );
    }, 3000);
  };

  const handleAddNewImage = () => {
    const newImage: any = {
      id: Date.now().toString(),
      status: "loading",
      prompt:
        "A futuristic cityscape with flying vehicles, neon lights, and tall skyscrapers reaching into the clouds.",
      thumbnailUrl: "/placeholder.svg?height=80&width=80",
      imageUrl: "/placeholder.svg?height=500&width=800",
    };

    setImages([newImage, ...images]);

    // Simulate random completion (success or error)
    setTimeout(() => {
      const randomStatus = Math.random() > 0.3 ? "success" : "error";
      setImages((prevImages) =>
        prevImages.map((image) =>
          image.id === newImage.id
            ? {
                ...image,
                status: randomStatus,
                ...(randomStatus === "error" && {
                  errorMessage:
                    "Looks like this content may go against our guidelines. Let's try something different!",
                }),
              }
            : image,
        ),
      );
    }, 3000);
  };

  return (
    <main className="bg-black text-white p-4 md:p-8 h-full">
      <div className="max-w-6xl mx-auto">
        <ImageGallery
          images={images}
          onDelete={handleDelete}
          onRerun={handleRerun}
        />
      </div>
    </main>
  );
}
