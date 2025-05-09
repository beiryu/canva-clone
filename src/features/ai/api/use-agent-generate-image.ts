import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.ai)["agent-generate-image"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.ai)["agent-generate-image"]["$post"]
>["json"];

export const useAgentGenerateImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["agent-generate-image"].$post({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      return await response.json();
    },
    onMutate: (json) => {
      queryClient.setQueryData(
        ["project-images", { projectId: json.projectId }],
        (oldData: any) => {
          const newLoadingImage = {
            id: "id",
            projectId: json.projectId,
            userId: "userId",
            fullPath: "",
            prompt: json.prompt,
            style: json.style,
            settings: json.settings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (oldData && Array.isArray(oldData)) {
            return [newLoadingImage, ...oldData];
          }
          return [newLoadingImage];
        },
      );
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: ["project-images", { projectId: data.projectId }],
      });

      toast.success("Image generated successfully");
    },
    onError: () => {
      toast.error("Failed to generate image");
    },
  });

  return mutation;
};
