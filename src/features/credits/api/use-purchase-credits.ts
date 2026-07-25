import { useMutation } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { toast } from "sonner";
import { InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.credits.purchase)["$get"],
  200
>;

export const usePurchaseCredits = () => {
  const mutation = useMutation<ResponseType, Error, number>({
    mutationFn: async (amount: number) => {
      const response = await client.api.credits.purchase.$get({
        query: {
          amount,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase session");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to create purchase session");
    },
  });

  return mutation;
};
