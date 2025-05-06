"use client";

import { ImageCard } from "./image-card";
import { AnimatePresence, motion } from "framer-motion";

interface ImageGalleryProps {
  images: any[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-700 rounded-lg">
        <p className="text-gray-400 mb-2">No images generated yet</p>
        <p className="text-sm text-gray-500">
          Click the Generate New Image button to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence>
        {images.map((image) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ImageCard image={image} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
