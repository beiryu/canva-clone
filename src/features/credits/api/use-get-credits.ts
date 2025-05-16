import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.credits)["balance"]["$get"],
  200
>;

export const useGetCredits = () => {
  return useQuery({
    queryKey: ["credits", "balance"],
    queryFn: async () => {
      const response = await client.api.credits.balance.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const { data } = await response.json();
      return data;
    },
  });
};
