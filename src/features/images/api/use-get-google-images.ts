import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

// Every search costs a Serper credit, so cache generously.
const GOOGLE_STALE_TIME = 5 * 60 * 1000;

export const useGetGoogleImages = (query?: string) => {
  const search = query?.trim() || "";

  const result = useQuery({
    queryKey: ["images", "google", search],
    queryFn: async () => {
      const response = await client.api.images.google.$get({
        query: { query: search },
      });

      if (!response.ok) {
        throw new Error("Failed to search Google images");
      }

      const { data } = await response.json();
      return data;
    },
    // No query means no results to show, so don't spend a credit on it.
    enabled: search.length > 0,
    staleTime: GOOGLE_STALE_TIME,
  });

  return result;
};
