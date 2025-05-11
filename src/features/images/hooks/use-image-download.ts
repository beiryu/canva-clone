import { useState } from "react";
import { toast } from "sonner";

export function useImageDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadImage = async (imageUrl: string, fileName?: string) => {
    if (!imageUrl) {
      toast.error("Image URL is missing");
      return;
    }

    setIsDownloading(true);

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Error downloading image");
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadImage,
    isDownloading,
  };
}
