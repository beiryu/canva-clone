import { useState, useEffect } from "react";

interface UseImageLoadingOptions {
  simulateProgress?: boolean;
  initialLoadingState?: boolean;
}

interface UseImageLoadingReturn {
  isLoading: boolean;
  progress: number;
  handleImageLoad: () => void;
  resetLoading: () => void;
}

export function useImageLoading(
  options: UseImageLoadingOptions = {},
): UseImageLoadingReturn {
  const { simulateProgress = true, initialLoadingState = true } = options;

  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [progress, setProgress] = useState(0);

  // Simulate loading progress for better UX
  useEffect(() => {
    if (!simulateProgress) return;

    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slowly increase to 90%, the final 10% happens when image actually loads
          const newProgress = prev + (90 - prev) * 0.1;
          return newProgress > 89 ? 89 : newProgress;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isLoading, simulateProgress]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const resetLoading = () => {
    setIsLoading(initialLoadingState);
    setProgress(0);
  };

  return {
    isLoading,
    progress,
    handleImageLoad,
    resetLoading,
  };
}
