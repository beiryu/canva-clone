import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const usePurchaseCredits = () => {
  return useMutation({
    mutationFn: async (amount: number) => {
      const response = await client.api.credits["purchase"].$get({
        query: {
          amount,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase session");
      }

      const { data } = await response.json();
      return data;
    },
  });
};
