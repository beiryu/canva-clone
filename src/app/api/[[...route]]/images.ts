import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";
import { desc, eq } from "drizzle-orm";

import { unsplash } from "@/lib/unsplash";
import { uploadedImages } from "@/db/schema";
import { db } from "@/db/drizzle";
import { uploadFileToSupabase } from "@/features/images/core/supabase";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];

const app = new Hono()
  .get("/", verifyAuth(), async (c) => {
    const images = await unsplash.photos.getRandom({
      collectionIds: DEFAULT_COLLECTION_IDS,
      count: DEFAULT_COUNT,
    });

    if (images.errors) {
      return c.json({ error: "Something went wrong" }, 400);
    }

    let response = images.response;

    if (!Array.isArray(response)) {
      response = [response];
    }

    return c.json({ data: response });
  })
  .get("/uploaded", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const data = await db
      .select()
      .from(uploadedImages)
      .where(eq(uploadedImages.userId, auth.token.id))
      .orderBy(desc(uploadedImages.createdAt));

    return c.json({ data });
  })
  .post("/upload", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const formData = await c.req.formData();
      const image = formData.get("image") as File;
      const projectId = formData.get("projectId") as string;

      if (!image) {
        return c.json({ error: "No image provided" }, 400);
      }

      if (!projectId) {
        return c.json({ error: "Project ID is required" }, 400);
      }

      // Upload the image to Supabase
      const uploadResult = await uploadFileToSupabase({
        file: image,
        userId: auth.token.id,
        projectId,
        prefix: "uploaded",
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

      return c.json({ data: savedImage });
    } catch (error) {
      console.error("Error uploading image:", error);
      return c.json({ error: "Failed to upload image" }, 500);
    }
  });

export default app;
