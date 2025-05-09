import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type UploadImageParams = {
  image: File;
  projectId: string;
};

export const useUploadImage = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ image, projectId }: UploadImageParams) => {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("projectId", projectId);

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate the uploaded images query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["images", "uploaded"] });

      // Also invalidate project images if they're being used
      if (data.projectId) {
        queryClient.invalidateQueries({
          queryKey: ["project-images", { projectId: data.projectId }],
        });
      }

      toast.success("Image uploaded successfully");
    },
    onError: (error) => {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    },
  });

  return mutation;
};
