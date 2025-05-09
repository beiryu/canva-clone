import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.ai)["agent-generate-image"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.ai)["agent-generate-image"]["$post"]
>["json"];

export const useAgentGenerateImage = () => {
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
  });

  return mutation;
};
