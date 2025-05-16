import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";
import { InferResponseType } from "hono";

type ResponseType = InferResponseType<
  (typeof client.api.credits)["history"]["$get"],
  200
>;

export const useGetCreditHistory = () => {
  return useQuery({
    queryKey: ["credits", "history"],
    queryFn: async () => {
      const response = await client.api.credits.history.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch credit history");
      }

      const { data } = await response.json();
      return data;
    },
  });
};
