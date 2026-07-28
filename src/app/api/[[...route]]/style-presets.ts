import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { db } from "@/db/drizzle";
import { stylePresets } from "@/db/schema";
import { AgentManager } from "@/features/agents/managers";
import { DEFAULT_STYLE_ANALYSIS_MODEL } from "@/features/agents/model-ids";
import {
  getSignedUrl,
  IMAGES_BUCKET_NAME,
  uploadFileToSupabase,
} from "@/features/images/core/supabase";
import { convertToFile } from "@/features/images/utils";

/**
 * Appended to every generated preset. These rules are constant and do not
 * depend on the reference image, so they are composed here rather than being
 * asked of a 7B vision model that would sometimes forget them.
 *
 * Deliberately limited to what is technically required for a thumbnail to
 * survive being 168x94 pixels. An earlier version also demanded the subject be
 * "offset to one side to leave clear negative space for a headline", which read
 * to the image model as an instruction to omit the headline — the same clause,
 * for the same reason, was removed from AUTO_PROMPT_SYSTEM. Where the subject
 * sits is the composition's business, not this constant's.
 */
const THUMBNAIL_COMPOSITION_RULES =
  "Compose as a thumbnail: one bold hero subject filling 60-70% of the frame. " +
  "Push contrast and subject/background separation hard. The image must stay " +
  "readable when scaled down to 168x94 pixels, so avoid fine detail, thin " +
  "lines, and busy backgrounds. Keep all key elements inside safe margins.";

/**
 * Presets belong to a user, not a project, but `uploadFileToSupabase` builds
 * its storage path as `${userId}/${projectId}/${fileName}`. This is the path
 * segment that stands in for a project.
 */
const PRESET_STORAGE_SCOPE = "style-presets";

const app = new Hono()
  /**
   * Reads the reference image and returns a draft instruction. Deliberately
   * does not persist anything — the client shows the draft for review and
   * editing first, because vision models get this wrong often enough that
   * saving unseen output would be a trap.
   */
  .post(
    "/analyze",
    verifyAuth(),
    zValidator("json", z.object({ image: z.string().min(1) })),
    async (c) => {
      const { image } = c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        const referenceFile = await convertToFile(image, {
          filePrefix: "style-ref",
        });

        const uploaded = await uploadFileToSupabase({
          file: referenceFile,
          userId: auth.token.id,
          projectId: PRESET_STORAGE_SCOPE,
          prefix: "style-ref",
          bucketName: IMAGES_BUCKET_NAME,
        });

        // Replicate cannot read a private object or reach localhost, so the
        // model is handed a signed URL. getSignedUrl takes MINUTES.
        const signedUrl = await getSignedUrl(
          uploaded.path,
          15,
          IMAGES_BUCKET_NAME,
        );

        const agentManager = new AgentManager();

        const { instruction } = await agentManager.analyzeStyle({
          model: DEFAULT_STYLE_ANALYSIS_MODEL,
          image: signedUrl,
        });

        return c.json({
          data: {
            instruction: `${instruction}\n\n${THUMBNAIL_COMPOSITION_RULES}`,
            referencePath: uploaded.fullPath,
            model: DEFAULT_STYLE_ANALYSIS_MODEL,
          },
        });
      } catch (error) {
        console.error("Style analysis error:", error);
        return c.json({ error: "Failed to analyze reference image" }, 500);
      }
    },
  )
  .get("/", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await db
      .select()
      .from(stylePresets)
      .where(eq(stylePresets.userId, auth.token.id))
      .orderBy(desc(stylePresets.createdAt));

    return c.json({ data });
  })
  .post(
    "/",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(60),
        instruction: z.string().min(1),
        referencePath: z.string().optional(),
        model: z.string().optional(),
      }),
    ),
    async (c) => {
      const { name, instruction, referencePath, model } = c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [preset] = await db
        .insert(stylePresets)
        .values({
          userId: auth.token.id,
          name,
          instruction,
          referencePath,
          model,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return c.json({ data: preset });
    },
  )
  .patch(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(60).optional(),
        instruction: z.string().min(1).optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const values = c.req.valid("json");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [preset] = await db
        .update(stylePresets)
        .set({ ...values, updatedAt: new Date() })
        // Scoped by userId as well as id so one user cannot edit another's.
        .where(
          and(eq(stylePresets.id, id), eq(stylePresets.userId, auth.token.id)),
        )
        .returning();

      if (!preset) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: preset });
    },
  )
  .delete(
    "/:id",
    verifyAuth(),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");

      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [preset] = await db
        .delete(stylePresets)
        .where(
          and(eq(stylePresets.id, id), eq(stylePresets.userId, auth.token.id)),
        )
        .returning({ id: stylePresets.id });

      if (!preset) {
        return c.json({ error: "Not found" }, 404);
      }

      return c.json({ data: preset });
    },
  );

export default app;
