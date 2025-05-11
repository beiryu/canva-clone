import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { AgentManager } from "@/features/agents/agent-manager";
import {
  ImageAspectRatio,
  ImageGenerationModel,
  ImageQuality,
  TextGenerationModel,
} from "@/features/agents/types";
import { db } from "@/db/drizzle";
import { generatedImages, uploadedImages } from "@/db/schema";
import {
  uploadFileToSupabase,
  uploadRemoteImageToSupabase,
  getSignedUrl,
  IMAGES_BUCKET_NAME,
  TEMPORARY_IMAGES_BUCKET_NAME,
} from "@/features/images/core/supabase";
import { replicate } from "@/lib/replicate";
import { convertToFile } from "@/features/images/utils";

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
    "/agent-generate-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        projectId: z.string(),
        model: z.string(),
        prompt: z.string(),
        style: z.string(),
        canvasImage: z.string().optional(),
        settings: z.object({
          aspectRatio: z.string().optional(),
          quality: z.string().optional(),
        }),
      }),
    ),
    async (c) => {
      let { projectId, prompt, style, settings, canvasImage, model } =
        c.req.valid("json");

      const { aspectRatio, quality } = settings;

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (canvasImage) {
        const canvasImageFile = await convertToFile(canvasImage, {
          filePrefix: "canvas-image",
        });

        const canvasImageUrl = await uploadFileToSupabase({
          file: canvasImageFile,
          userId: auth.token.id,
          projectId: projectId,
          prefix: "temp",
          bucketName: TEMPORARY_IMAGES_BUCKET_NAME,
        });

        canvasImage = await getSignedUrl(
          canvasImageUrl.path,
          15,
          TEMPORARY_IMAGES_BUCKET_NAME,
        );
      }

      // Initialize the agent manager with API keys from env
      const agentManager = new AgentManager();

      try {
        const result = await agentManager.generateImage({
          model: model as ImageGenerationModel,
          prompt,
          style,
          canvasImage,
          settings: {
            aspectRatio: aspectRatio as ImageAspectRatio,
            quality: quality as ImageQuality,
          },
        });

        // Upload the result to Supabase
        const { fullPath } = await uploadFileToSupabase({
          file: result.file,
          userId: auth.token.id,
          projectId: projectId,
          prefix: "generated-image",
          bucketName: IMAGES_BUCKET_NAME,
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
  )
  .post(
    "/agent-enhance-prompt",
    verifyAuth(),
    zValidator(
      "json",
      z
        .object({
          model: z.string(),
          prompt: z.string(),
        })
        .default({
          model: "gpt-4",
          prompt: "",
        }),
    ),
    async (c) => {
      let { model, prompt } = c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const agentManager = new AgentManager();

      try {
        const result = await agentManager.enhancePrompt({
          model: model as TextGenerationModel,
          currentPrompt: prompt,
        });

        return c.json({
          data: result,
        });
      } catch (error) {
        console.error("Prompt enhancement error:", error);
        return c.json({ error: "Failed to enhance prompt" }, 500);
      }
    },
  );

export default app;
