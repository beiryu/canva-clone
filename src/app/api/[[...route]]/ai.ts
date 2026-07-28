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
import { createStyleInstruction } from "@/features/agents/utils";
import { convertToFile } from "@/features/images/utils";
import { resolveStylePreset } from "@/features/style-presets/core/resolve-style-preset";

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

      // A style id outside the built-in set is a user-created preset, whose
      // guidance lives in the database. Without this lookup the id would fall
      // through createStyleInstruction's switch, return "", and silently drop
      // the [STYLE GUIDANCE] block — a preset that appears to do nothing.
      //
      // The reference image comes back too: the stored instruction is only that
      // image summarised into a paragraph, which is not enough for a generation
      // to actually look like the reference.
      const preset = await resolveStylePreset({
        styleId: style,
        userId: auth.token.id,
        // A model that cannot take the canvas cannot take a reference either,
        // so skip the storage round trip entirely.
        withReferenceImage: supportsImageInput,
      });

      const agentManager = new AgentManager();

      try {
        const result = await agentManager.generateImage({
          model,
          prompt,
          style,
          styleInstruction: preset?.instruction,
          styleReferenceImage: preset?.referenceImageUrl ?? undefined,
          styleReferenceMimeType: preset?.referenceMimeType ?? undefined,
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
    "/agent-auto-prompt",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        // Field-level default so the server owns the choice of text model and
        // the client does not hard-code one.
        model: textModelSchema.default(DEFAULT_TEXT_MODEL),
        // The canvas is the input; the typed prompt is only optional context,
        // since the prompt box starts empty.
        canvasImage: z.string().min(1),
        prompt: z.string().optional(),
        // The style *id*, resolved server-side exactly as the generate route
        // does. Taking the instruction text from the client instead would let
        // anyone inject arbitrary text into the model's context.
        style: z.string().optional(),
        // Only consulted for built-in styles, whose display names live in the
        // client store rather than the database.
        styleName: z.string().max(60).optional(),
      }),
    ),
    async (c) => {
      const { model, canvasImage, prompt, style, styleName } =
        c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Text only — the prompt writer needs to know what style is coming, not
      // to look at it. Handing a vision model the reference image would put the
      // reference's *subject* into the prompt it writes.
      const preset = await resolveStylePreset({
        styleId: style,
        userId: auth.token.id,
        withReferenceImage: false,
      });

      // createStyleInstruction returns "" for anything outside its switch,
      // which would otherwise read as a style with empty guidance.
      const styleInstruction =
        preset?.instruction ||
        (style ? createStyleInstruction(style) : "") ||
        undefined;

      const agentManager = new AgentManager();

      try {
        // Deliberately no Supabase upload here, unlike the generate route: the
        // capture is a throwaway 512px JPEG and OpenAI accepts it inline, so
        // persisting it would only add latency and storage litter.
        const result = await agentManager.autoPrompt({
          model,
          canvasImage,
          context: prompt,
          styleName: preset?.name ?? styleName,
          styleInstruction,
        });

        return c.json({
          data: result,
        });
      } catch (error) {
        console.error("Auto prompt error:", error);
        return c.json({ error: "Failed to write a prompt" }, 500);
      }
    },
  );

export default app;
