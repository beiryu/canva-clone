"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

import { useCreateProject } from "@/features/projects/api/use-create-project";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";

export const Banner = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const mutation = useCreateProject();

  const onClick = () => {
    setLoading(true);
    mutation.mutate(
      {
        name: "Untitled project",
        json: "",
        width: 900,
        height: 1200,
      },
      {
        onSuccess: ({ data }) => {
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-background p-8 md:p-10">
      {/* Abstract neural network background pattern */}
      <div className="absolute inset-0 opacity-10">
        <Image
          src="/bg.jpg"
          alt=""
          fill
          className="object-cover"
          aria-hidden="true"
          style={{ objectPosition: "0 40%" }}
        />
      </div>

      {/* Content container */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
        {/* Icon */}
        <div className="flex-shrink-0">
          <motion.div
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
            className="relative flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-green-600/20 to-primary/20 backdrop-blur-sm border"
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
              className="relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-green-500 to-primary"
            >
              <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </motion.div>
          </motion.div>
        </div>

        {/* Text content */}
        <div className="flex-1 space-y-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Sketch to Thumbnail{" "}
            <span className="text-primary">with AI Magic</span>
          </h1>

          <p className="text-muted-foreground max-w-2xl">
            Draw your ideas with simple sketches in our canvas, and let AI
            transform them into professional, eye-catching thumbnails. From
            rough drafts to stunning visuals in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              onClick={onClick}
              disabled={mutation.isPending}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
            >
              Start Creating Thumbnail{" "}
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-primary/10 blur-xl"></div>
      <div className="absolute bottom-10 left-1/4 w-32 h-32 rounded-full bg-accent/10 blur-xl"></div>

      {/* Stats or features */}
      <div className="relative z-10 mt-10 pt-6 border-t border-border">
        <div className="flex flex-wrap justify-start md:justify-start gap-6 md:gap-12 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">Simple sketch tools</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">
              AI-powered transformation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">
              Professional results instantly
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
