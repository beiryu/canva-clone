import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { AgentManager } from "@/features/agents/agent-manager";
import {
  ImageAspectRatio,
  ImageGenerationModel,
  ImageQuality,
} from "@/features/agents/types";
import { db } from "@/db/drizzle";
import { generatedImages, uploadedImages } from "@/db/schema";
import { uploadRemoteImageToSupabase } from "@/features/images/core/supabase";
import { replicate } from "@/lib/replicate";

const app = new Hono()
  .post(
    "/remove-bg",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        image: z.string(),
        projectId: z.string(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");
      const { image, projectId } = c.req.valid("json");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const input = {
        image: image,
      };

      const output: unknown = await replicate.run(
        "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
        { input },
      );

      const resultImageUrl = output as string;

      // Upload the result to Supabase
      const uploadResult = await uploadRemoteImageToSupabase({
        imageUrl: resultImageUrl,
        userId: auth.token.id,
        projectId: projectId,
        prefix: "remove-bg",
      });

      // Save the image metadata to the database
      const now = new Date();
      const [savedImage] = await db
        .insert(uploadedImages)
        .values({
          fullPath: uploadResult.fullPath,
          fileName: uploadResult.fileName,
          fileSize: uploadResult.fileSize,
          fileType: uploadResult.fileType,
          userId: auth.token.id,
          projectId: projectId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return c.json({
        data: savedImage,
      });
    },
  )
  .post(
    "/generate-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        prompt: z.string(),
      }),
    ),
    async (c) => {
      const { prompt } = c.req.valid("json");

      const input = {
        cfg: 3.5,
        steps: 28,
        prompt: prompt,
        aspect_ratio: "3:2",
        output_format: "webp",
        output_quality: 90,
        negative_prompt: "",
        prompt_strength: 0.85,
      };

      const output = await replicate.run("stability-ai/stable-diffusion-3", {
        input,
      });

      const res = output as Array<string>;

      return c.json({ data: res[0] });
    },
  )
  .post(
    "/agent-generate-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        projectId: z.string(),
        prompt: z.string(),
        style: z.string(),
        canvasImage: z.string().optional(),
        settings: z.object({
          model: z.string(),
          aspectRatio: z.string().optional(),
          quality: z.string().optional(),
          seed: z.number().optional(),
        }),
      }),
    ),
    async (c) => {
      const { projectId, prompt, style, settings, canvasImage } =
        c.req.valid("json");

      const { model, aspectRatio, quality, seed } = settings;

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Initialize the agent manager with API keys from env
      const agentManager = new AgentManager();

      try {
        const result = await agentManager.generateImage({
          prompt,
          model: model as ImageGenerationModel,
          canvasImage,
          aspectRatio: aspectRatio as ImageAspectRatio,
          quality: quality as ImageQuality,
          seed: seed,
        });

        // Upload the result to Supabase
        const { fullPath } = await uploadRemoteImageToSupabase({
          imageUrl: result.url,
          userId: auth.token.id,
          projectId: projectId,
          prefix: "agent-generate-image",
        });

        // Save the image metadata to the database
        const [savedImage] = await db
          .insert(generatedImages)
          .values({
            projectId,
            userId: auth.token.id,
            fullPath,
            prompt,
            style,
            settings,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return c.json({
          data: savedImage,
        });
      } catch (error) {
        console.error("Image generation error:", error);
        return c.json({ error: "Failed to generate image" }, 500);
      }
    },
  );

export default app;
