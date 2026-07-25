import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

// Unsplash demo apps are limited to 50 requests/hour, so keep results fresh for
// a while instead of refetching on every sidebar open.
const UNSPLASH_STALE_TIME = 5 * 60 * 1000;

export const useGetUnsplashImages = (query?: string) => {
  const search = query?.trim() || "";

  const result = useQuery({
    queryKey: ["images", "unsplash", search],
    queryFn: async () => {
      const response = await client.api.images.unsplash.$get({
        query: { query: search },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch Unsplash images");
      }

      const { data } = await response.json();
      return data;
    },
    // Keep the previous grid on screen while a new search is in flight.
    placeholderData: keepPreviousData,
    staleTime: UNSPLASH_STALE_TIME,
  });

  return result;
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

// Combined hook to get both Unsplash and uploaded images. Loading/error state is
// kept per source so a stock search never puts the uploads tab into a spinner.
export const useGetImages = (query?: string) => {
  const unsplashQuery = useGetUnsplashImages(query);
  const uploadedQuery = useGetUploadedImages();

  return {
    unsplashImages: unsplashQuery.data || [],
    uploadedImages: uploadedQuery.data || [],
    isLoadingStock: unsplashQuery.isLoading,
    isErrorStock: unsplashQuery.isError,
    isFetchingStock: unsplashQuery.isFetching,
    isLoadingUploads: uploadedQuery.isLoading,
    isErrorUploads: uploadedQuery.isError,
  };
};
