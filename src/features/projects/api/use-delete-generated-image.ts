import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.projects)[":projectId"]["images"][":imageId"]["$delete"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.projects)[":projectId"]["images"][":imageId"]["$delete"]
>["param"];

export const useDeleteGeneratedImage = (projectId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, { imageId: string }>({
    mutationFn: async ({ imageId }) => {
      const response = await client.api.projects[":projectId"].images[
        ":imageId"
      ].$delete({
        param: {
          projectId,
          imageId,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete generated image");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Image deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["project-images", { projectId }],
      });
    },
    onError: () => {
      toast.error("Failed to delete image");
    },
  });

  return mutation;
};
