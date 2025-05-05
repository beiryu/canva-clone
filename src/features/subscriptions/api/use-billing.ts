import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export const useBilling = () => {
  const mutation = useMutation<any, Error>({
    mutationFn: async () => {
      // Billing portal không hỗ trợ với Polar, có thể hiển thị thông báo hoặc chuyển hướng checkout lại
      const response = await fetch("/api/polar/checkout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      const data = await response.json().catch(() => null);
      if (data?.url) {
        window.location.href = data.url;
      }
      return data;
    },
    onSuccess: ({ url }) => {
      if (url) {
        window.location.href = url;
      }
    },
    onError: () => {
      toast.error("Failed to create session");
    },
  });

  return mutation;
};
