import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  (typeof client.api.ai)["agent-enhance-prompt"]["$post"],
  200
>;

type RequestType = InferRequestType<
  (typeof client.api.ai)["agent-enhance-prompt"]["$post"]
>["json"];

export const useAgentEnhancePrompt = () => {
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.ai["agent-enhance-prompt"].$post({
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to enhance prompt");
      }

      return await response.json();
    },
  });

  return mutation;
};
