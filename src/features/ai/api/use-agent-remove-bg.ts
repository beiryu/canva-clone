import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.ai)["agent-remove-bg"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.ai)["agent-remove-bg"]["$post"]
>["json"];

export const useAgentRemoveBg = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["agent-remove-bg"].$post({ json });

      if (!response.ok) {
        throw new Error("Failed to remove background from image");
      }

      return await response.json();
    },
    onSuccess: ({ data: { projectId } }) => {
      // Invalidate the uploaded images query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["images", "uploaded"] });

      // Also invalidate project images if they're being used
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project-images", { projectId }],
        });
      }

      toast.success("Background removed successfully");
    },
    onError: (error) => {
      console.error("Error removing background from image:", error);
      toast.error("Failed to remove background from image");
    },
  });

  return mutation;
};
