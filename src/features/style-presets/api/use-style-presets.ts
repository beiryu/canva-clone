import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

export type StylePreset = InferResponseType<
  (typeof client.api)["style-presets"]["$get"],
  200
>["data"][number];

export const useStylePresets = () => {
  const query = useQuery({
    queryKey: ["style-presets"],
    queryFn: async () => {
      const response = await client.api["style-presets"].$get();

      if (!response.ok) {
        throw new Error("Failed to fetch style presets");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
