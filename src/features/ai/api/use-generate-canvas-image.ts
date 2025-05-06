import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.ai)["generate-canvas-image"]["$post"]
>;

type RequestType = InferRequestType<
  (typeof client.api.ai)["generate-canvas-image"]["$post"]
>["json"];

export const useGenerateCanvasImage = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["generate-canvas-image"].$post({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to generate image from canvas");
      }

      return await response.json();
    },
  });

  return mutation;
};
