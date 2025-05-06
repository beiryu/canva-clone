import { Wand2 } from "lucide-react";
import { motion } from "framer-motion";

interface MagicWandButtonProps {
  onClick: () => void;
}

export const MagicWandButton = ({ onClick }: MagicWandButtonProps) => {
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
      <motion.div
        onClick={onClick}
        initial={{ y: 0 }}
        animate={{
          y: [-10, 0, -10],
          boxShadow: [
            "0 0 15px rgba(34, 197, 94, 0.2)",
            "0 0 25px rgba(34, 197, 94, 0.4)",
            "0 0 15px rgba(34, 197, 94, 0.2)",
          ],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-600/20 to-primary/20 backdrop-blur-sm border cursor-pointer"
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-green-600/30 to-primary/30 blur-sm"
        />
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-primary"
        >
          <Wand2 className="w-6 h-6 text-white" />
        </motion.div>
      </motion.div>
    </div>
  );
};
