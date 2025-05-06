import { useQuery } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.projects)[":id"]["images"]["$get"],
  200
>;

export const useProjectGeneratedImages = (projectId: string) => {
  const query = useQuery({
    enabled: !!projectId,
    queryKey: ["project-images", { projectId }],
    queryFn: async () => {
      const response = await client.api.projects[":id"].images.$get({
        param: { id: projectId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch project images");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
