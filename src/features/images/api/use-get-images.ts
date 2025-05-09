import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGetUnsplashImages = () => {
  const query = useQuery({
    queryKey: ["images", "unsplash"],
    queryFn: async () => {
      const response = await client.api.images.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch Unsplash images");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};

export const useGetUploadedImages = () => {
  const query = useQuery({
    queryKey: ["images", "uploaded"],
    queryFn: async () => {
      const response = await client.api.images.uploaded.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch uploaded images");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};

// Combined hook to get both Unsplash and uploaded images
export const useGetImages = () => {
  const unsplashQuery = useGetUnsplashImages();
  const uploadedQuery = useGetUploadedImages();

  const isLoading = unsplashQuery.isLoading || uploadedQuery.isLoading;
  const isError = unsplashQuery.isError || uploadedQuery.isError;

  return {
    unsplashImages: unsplashQuery.data || [],
    uploadedImages: uploadedQuery.data || [],
    isLoading,
    isError,
  };
};
