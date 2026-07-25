import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<
  typeof client.api.images.import.$post,
  200
>;
type RequestType = InferRequestType<
  typeof client.api.images.import.$post
>["json"];

/**
 * Re-hosts a remote image (a Google Images or Unsplash search result) on
 * Supabase so the canvas loads our own copy instead of a third-party host, and
 * records it as an upload.
 */
export const useImportImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.images.import.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to import image");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ["images", "uploaded"] });

      if (data?.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project-images", { projectId: data.projectId }],
        });
      }
    },
    onError: (error) => {
      console.error("Error importing image:", error);
      toast.error("Failed to import image");
    },
  });

  return mutation;
};
