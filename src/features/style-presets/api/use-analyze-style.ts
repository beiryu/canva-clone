import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api)["style-presets"]["analyze"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api)["style-presets"]["analyze"]["$post"]
>["json"];

/**
 * Produces a draft instruction from a reference image. Nothing is persisted —
 * the caller reviews and edits the result, then saves it with
 * `useCreateStylePreset`.
 */
export const useAnalyzeStyle = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api["style-presets"].analyze.$post({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze reference image");
      }

      return await response.json();
    },
    onError: (error) => {
      console.error("Error analyzing reference image:", error);
      toast.error("Failed to read the reference image");
    },
  });

  return mutation;
};
