import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { generatedImages, uploadedImages } from "@/db/schema";
import { AgentManager } from "@/features/agents/managers";
import {
  DEFAULT_TEXT_MODEL,
  IMAGE_ASPECT_RATIOS,
  IMAGE_GENERATION_MODELS,
  IMAGE_QUALITIES,
  SKETCH_STRICTNESS,
  TEXT_GENERATION_MODELS,
} from "@/features/agents/model-ids";
import { modelRegistry } from "@/features/agents/models";
import {
  getSignedUrl,
  IMAGES_BUCKET_NAME,
  TEMP_IMAGES_BUCKET_NAME,
  uploadFileToSupabase,
} from "@/features/images/core/supabase";
import { convertToFile } from "@/features/images/utils";

// Derived from the model-ids tuples rather than modelRegistry.keys(), which
// widens to AnyModel[] (rejected by z.enum) and would also let the text and
// background-remover models through the image route.
const imageModelSchema = z.enum(IMAGE_GENERATION_MODELS);
const textModelSchema = z.enum(TEXT_GENERATION_MODELS);

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

      const uploadResult = await uploadFileToSupabase({
        file: result.file,
        userId: auth.token.id,
        projectId: projectId,
        prefix: "remove-bg",
        bucketName: IMAGES_BUCKET_NAME,
      });

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
        model: imageModelSchema,
        prompt: z.string().min(1),
        style: z.string(),
        canvasImage: z.string().optional(),
        settings: z.object({
          aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).optional(),
          quality: z.enum(IMAGE_QUALITIES).optional(),
          strictness: z.enum(SKETCH_STRICTNESS).optional(),
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

      // Correctness guard against a stale client: never upload or sign a canvas
      // image for a model that cannot consume one. The client gates this too,
      // which is what actually saves the bandwidth.
      const supportsImageInput = Boolean(
        modelRegistry.get(model)?.params.supportsImageInput,
      );

      if (canvasImage && !supportsImageInput) {
        canvasImage = undefined;
      } else if (canvasImage) {
        const canvasImageFile = await convertToFile(canvasImage, {
          filePrefix: "canvas-image",
        });

        const canvasImageUrl = await uploadFileToSupabase({
          file: canvasImageFile,
          userId: auth.token.id,
          projectId: projectId,
          prefix: "temp",
          bucketName: TEMP_IMAGES_BUCKET_NAME,
        });

        // Note: getSignedUrl takes MINUTES (it multiplies by 60), so this is a
        // 15-minute expiry — long enough for a queued Replicate prediction.
        canvasImage = await getSignedUrl(
          canvasImageUrl.path,
          15,
          TEMP_IMAGES_BUCKET_NAME,
        );
      }

      const agentManager = new AgentManager();

      try {
        const result = await agentManager.generateImage({
          model,
          prompt,
          style,
          canvasImage,
          settings: { aspectRatio, quality, strictness },
        });

        const { fullPath } = await uploadFileToSupabase({
          file: result.file,
          userId: auth.token.id,
          projectId: projectId,
          prefix: "generated-image",
          bucketName: IMAGES_BUCKET_NAME,
        });

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
            providerName: result.providerName,
            providerImageId: result.providerImageId,
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
      z.object({
        // Field-level default so the server owns the choice of text model and
        // the client does not hard-code one.
        model: textModelSchema.default(DEFAULT_TEXT_MODEL),
        prompt: z.string().min(1),
      }),
    ),
    async (c) => {
      const { model, prompt } = c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const agentManager = new AgentManager();

      try {
        const result = await agentManager.enhancePrompt({
          model,
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
