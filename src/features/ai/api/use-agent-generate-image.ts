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
        (oldData) => {
          const newLoadingImage = {
            id: "id",
            projectId: json.projectId,
            userId: "userId",
            fullPath: "",
            prompt: json.prompt,
            style: json.style,
            model: json.model,
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

      // The Image sidebar's Generated tab is user-wide, so it has its own cache
      // entry that the project-scoped key above does not touch.
      queryClient.invalidateQueries({ queryKey: ["images", "generated"] });

      toast.success("Image generated successfully");
    },
    onError: (error, variables) => {
      queryClient.setQueryData(
        ["project-images", { projectId: variables.projectId }],
        (oldData) => {
          if (oldData && Array.isArray(oldData)) {
            return oldData.filter((image) => image.id !== "id");
          }
          return oldData;
        },
      );

      toast.error("Failed to generate image");
    },
  });

  return mutation;
};
