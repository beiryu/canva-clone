import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["style-presets"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api)["style-presets"]["$post"]
>["json"];

export const useCreateStylePreset = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["style-presets"].$post({ json });

      if (!response.ok) {
        throw new Error("Failed to save style preset");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["style-presets"] });
      toast.success("Style preset saved");
    },
    onError: (error) => {
      console.error("Error saving style preset:", error);
      toast.error("Failed to save style preset");
    },
  });

  return mutation;
};
