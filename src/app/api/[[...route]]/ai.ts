import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { generatedImages, uploadedImages } from "@/db/schema";
import { AgentManager } from "@/features/agents/managers";
import {
  ImageAspectRatio,
  ImageGenerationModel,
  ImageQuality,
  SketchGuidanceStrictness,
  TextGenerationModel,
} from "@/features/agents/types";
import {
  getSignedUrl,
  IMAGES_BUCKET_NAME,
  TEMPORARY_IMAGES_BUCKET_NAME,
  uploadFileToSupabase,
} from "@/features/images/core/supabase";
import { convertToFile } from "@/features/images/utils";

const app = new Hono()
  .post(
    "/agent-remove-bg",
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

      const agentManager = new AgentManager();

      const result = await agentManager.removeBg({
        model: "labs/background-remover",
        image,
      });

      // Upload the result to Supabase
      const uploadResult = await uploadFileToSupabase({
        file: result.file,
        userId: auth.token.id,
        projectId: projectId,
        prefix: "remove-bg",
        bucketName: IMAGES_BUCKET_NAME,
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
          strictness: z.string().optional(),
        }),
      }),
    ),
    async (c) => {
      let { projectId, prompt, style, settings, canvasImage, model } =
        c.req.valid("json");

      const { aspectRatio, quality, strictness } = settings;

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
            strictness: strictness as SketchGuidanceStrictness,
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
            model,
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
