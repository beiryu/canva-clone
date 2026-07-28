import { Hono } from "hono";
import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { unsplash } from "@/lib/unsplash";
import { searchGoogleImages, SerperImage } from "@/lib/serper";
import { generatedImages, uploadedImages } from "@/db/schema";
import { db } from "@/db/drizzle";
import {
  IMAGES_BUCKET_NAME,
  uploadFileToSupabase,
  uploadRemoteImageToSupabase,
} from "@/features/images/core/supabase";
import { GoogleImage, StockImage } from "@/features/images/types";

const DEFAULT_COUNT = 50;
const DEFAULT_COLLECTION_IDS = ["317099"];
// Unsplash caps search results at 30 per page.
const SEARCH_PER_PAGE = 30;

type UnsplashPhoto = {
  id: string;
  alt_description: string | null;
  urls: { regular: string; small: string; thumb: string };
  links: { html: string; download_location: string };
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
  links: {
    html: photo.links.html,
    download_location: photo.links.download_location,
  },
  user: { name: photo.user.name },
});

const toGoogleImage = (image: SerperImage): GoogleImage => ({
  title: image.title,
  imageUrl: image.imageUrl,
  thumbnailUrl: image.thumbnailUrl,
  source: image.source,
  link: image.link,
  width: image.imageWidth,
  height: image.imageHeight,
});

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^0\.0\.0\.0$/,
];

/**
 * POST /import fetches a caller-supplied URL server-side, so it must not be
 * usable as a proxy into the deployment's own network.
 */
const isSafeRemoteImageUrl = (value: string) => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname;

  // Bare hostnames resolve to internal services on most container networks.
  if (!hostname.includes(".") && !hostname.includes(":")) {
    return false;
  }

  return !PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
};

/**
 * unsplash-js only takes the pathname + query off `downloadLocation` and always
 * calls its configured apiUrl, so a caller can't point the request elsewhere.
 * This check just stops our access key being used to hit arbitrary endpoints.
 */
const isUnsplashDownloadPath = (value: string) => {
  try {
    return /^\/photos\/[^/]+\/download$/.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

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
  .get(
    "/google",
    verifyAuth(),
    zValidator("query", z.object({ query: z.string().trim().optional() })),
    async (c) => {
      const { query } = c.req.valid("query");

      // Google has no "browse" equivalent, and every call costs a Serper credit.
      if (!query) {
        return c.json({ data: [] as GoogleImage[] });
      }

      try {
        const images = await searchGoogleImages({
          query,
          num: SEARCH_PER_PAGE,
        });

        const data: GoogleImage[] = images.map(toGoogleImage);

        return c.json({ data });
      } catch (error) {
        console.error("Error searching Google images:", error);
        return c.json({ error: "Something went wrong" }, 400);
      }
    },
  )
  .post(
    "/import",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        imageUrl: z.string().url(),
        projectId: z.string(),
        // Also names the stored file, so the source stays visible in storage.
        source: z.enum(["google", "unsplash"]).default("google"),
        downloadLocation: z.string().url().optional(),
      }),
    ),
    async (c) => {
      const auth = c.get("authUser");

      if (!auth.token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { imageUrl, projectId, source, downloadLocation } =
        c.req.valid("json");

      if (!isSafeRemoteImageUrl(imageUrl)) {
        return c.json({ error: "Invalid image URL" }, 400);
      }

      try {
        const uploadResult = await uploadRemoteImageToSupabase({
          imageUrl,
          userId: auth.token.id,
          projectId,
          prefix: source,
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

        if (
          source === "unsplash" &&
          downloadLocation &&
          isUnsplashDownloadPath(downloadLocation)
        ) {
          // Not awaited: a tracking failure must not fail the import.
          unsplash.photos
            .trackDownload({ downloadLocation })
            .catch((error) =>
              console.error("Failed to track Unsplash download:", error),
            );
        }

        return c.json({ data: savedImage });
      } catch (error) {
        console.error("Error importing remote image:", error);
        return c.json({ error: "Failed to import image" }, 500);
      }
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
  .get("/generated", verifyAuth(), async (c) => {
    const auth = c.get("authUser");

    if (!auth.token?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Scoped to the user, not the project — the point of this list is reusing
    // images generated in *other* projects. The bottom gallery covers the
    // current project via ["project-images", { projectId }].
    const data = await db
      .select()
      .from(generatedImages)
      .where(eq(generatedImages.userId, auth.token.id))
      .orderBy(desc(generatedImages.createdAt));

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

      const uploadResult = await uploadFileToSupabase({
        file: image,
        userId: auth.token.id,
        projectId,
        prefix: "uploaded",
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

      return c.json({ data: savedImage });
    } catch (error) {
      console.error("Error uploading image:", error);
      return c.json({ error: "Failed to upload image" }, 500);
    }
  });

export default app;
