import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.projects)[":id"]["images"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.projects)[":id"]["images"]["$post"]
>["json"];

export const useSaveGeneratedImage = (projectId: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.projects[":id"].images.$post({
        json,
        param: { id: projectId },
      });

      if (!response.ok) {
        throw new Error("Failed to save generated image");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Image saved successfully");
      queryClient.invalidateQueries({
        queryKey: ["project-images", { projectId }],
      });
    },
    onError: () => {
      toast.error("Failed to save generated image");
    },
  });

  return mutation;
};
