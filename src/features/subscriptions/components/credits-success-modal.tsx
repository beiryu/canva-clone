"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { useCreditsSuccessModal } from "@/features/subscriptions/store/use-credits-success-modal";

import {
  Dialog,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const CreditsSuccessModal = () => {
  const router = useRouter();
  const { isOpen, onClose } = useCreditsSuccessModal();

  const handleClose = () => {
    router.replace("/credits");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader className="flex items-center space-y-4">
          <Image src="/logo.png" alt="Logo" width={36} height={36} />
          <DialogTitle className="text-center">
            Credits purchased successfully!
          </DialogTitle>
          <DialogDescription className="text-center">
            You have successfully purchased credits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2 mt-4 gap-y-2">
          <Button className="w-full" onClick={handleClose}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
