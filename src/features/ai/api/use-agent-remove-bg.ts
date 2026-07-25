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

// Background removal takes 5-30s, so the request gets a loading toast that the
// success/error toast then replaces in place via its id.
type MutationContext = { toastId: string | number };

export const useAgentRemoveBg = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType,
    MutationContext
  >({
    mutationFn: async (json) => {
      const response = await client.api.ai["agent-remove-bg"].$post({ json });

      if (!response.ok) {
        throw new Error("Failed to remove background from image");
      }

      return await response.json();
    },
    onMutate: () => ({
      toastId: toast.loading("Removing background..."),
    }),
    onSuccess: ({ data: { projectId } }, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["images", "uploaded"] });

      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project-images", { projectId }],
        });
      }

      toast.success("Background removed successfully", { id: context?.toastId });
    },
    onError: (error, _variables, context) => {
      console.error("Error removing background from image:", error);
      toast.error("Failed to remove background from image", {
        id: context?.toastId,
      });
    },
  });

  return mutation;
};
