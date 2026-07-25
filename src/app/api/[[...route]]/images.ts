import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { unsplash } from "@/lib/unsplash";
import { uploadedImages } from "@/db/schema";
import { db } from "@/db/drizzle";
import {
  IMAGES_BUCKET_NAME,
  uploadFileToSupabase,
} from "@/features/images/core/supabase";
import { StockImage } from "@/features/images/types";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];
// Unsplash caps search results at 30 per page.
const SEARCH_PER_PAGE = 30;

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { regular: string; small: string; thumb: string };
  links: { html: string };
  user: { name: string };
};

const toStockImage = (photo: UnsplashPhoto): StockImage => ({
  id: photo.id,
  alt_description: photo.alt_description,
  urls: {
    regular: photo.urls.regular,
    small: photo.urls.small,
    thumb: photo.urls.thumb,
  },
  links: { html: photo.links.html },
  user: { name: photo.user.name },
});

const app = new Hono()
  .get(
    "/unsplash",
    verifyAuth(),
    zValidator("query", z.object({ query: z.string().trim().optional() })),
    async (c) => {
      const { query } = c.req.valid("query");

      if (query) {
        const images = await unsplash.search.getPhotos({
          query,
          perPage: SEARCH_PER_PAGE,
        });

        if (images.errors) {
          return c.json({ error: "Something went wrong" }, 400);
        }

        const data: StockImage[] = images.response.results.map(toStockImage);

        return c.json({ data });
      }

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

      const data: StockImage[] = response.map(toStockImage);

      return c.json({ data });
    },
  )
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

      return c.json({ data: savedImage });
    } catch (error) {
      console.error("Error uploading image:", error);
      return c.json({ error: "Failed to upload image" }, 500);
    }
  });

export default app;
