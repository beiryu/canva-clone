import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["style-presets"][":id"]["$delete"],
  200
>;

export const useDeleteStylePreset = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, string>({
    mutationFn: async (id) => {
      const response = await client.api["style-presets"][":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete style preset");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-presets"] });
      toast.success("Style preset deleted");
    },
    onError: (error) => {
      console.error("Error deleting style preset:", error);
      toast.error("Failed to delete style preset");
    },
  });

  return mutation;
};
