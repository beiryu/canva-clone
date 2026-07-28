import { and, eq } from "drizzle-orm";

import { db } from "@/db/drizzle";
import { stylePresets } from "@/db/schema";
import { BUILT_IN_STYLE_IDS } from "@/features/agents/model-ids";
import {
  getSignedUrl,
  IMAGES_BUCKET_NAME,
  storagePathFromFullPath,
} from "@/features/images/core/supabase";

/**
 * Formats both gpt-image-2's edit endpoint and Replicate accept. A preset whose
 * reference is anything else (avif, gif, heic) degrades to text-only guidance
 * rather than making OpenAI reject the whole generation with a 400.
 */
const USABLE_REFERENCE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Matches the canvas upload's expiry in `ai.ts` — long enough for a queued
 * Replicate prediction, short enough not to leak a durable public link. */
const REFERENCE_URL_TTL_MINUTES = 15;

export interface ResolvedStylePreset {
  id: string;
  name: string;
  instruction: string;
  /**
   * Signed URL for the reference image, or null when the preset was saved
   * without one, when the stored format is not something the image models
   * accept, or when signing failed.
   */
  referenceImageUrl: string | null;
  /**
   * MIME derived from the stored object's extension. Needed because
   * `convertToFile`'s http branch ignores the response content-type and stamps
   * whatever type it is handed (defaulting to image/webp).
   */
  referenceMimeType: string | null;
}

/**
 * Resolves a style id to its database-backed guidance, and optionally to a
 * fetchable URL for the reference image the user built the preset from.
 *
 * Built-in style ids resolve to null — their guidance is a hard-coded string in
 * `createStyleInstruction`, not a row. Callers therefore do not need their own
 * `BUILT_IN_STYLE_IDS` check.
 */
export const resolveStylePreset = async ({
  styleId,
  userId,
  withReferenceImage = false,
}: {
  styleId: string | undefined;
  userId: string;
  /** Skip the storage round trip when only the prose is needed. */
  withReferenceImage?: boolean;
}): Promise<ResolvedStylePreset | null> => {
  if (!styleId || BUILT_IN_STYLE_IDS.includes(styleId as never)) {
    return null;
  }

  const [preset] = await db
    .select({
      id: stylePresets.id,
      name: stylePresets.name,
      instruction: stylePresets.instruction,
      referencePath: stylePresets.referencePath,
    })
    .from(stylePresets)
    // Scoped by userId as well as id: a preset id is a bare UUID in the request
    // body, so without this any user could read another's guidance.
    .where(and(eq(stylePresets.id, styleId), eq(stylePresets.userId, userId)));

  if (!preset) {
    return null;
  }

  const base = {
    id: preset.id,
    name: preset.name,
    instruction: preset.instruction,
    referenceImageUrl: null,
    referenceMimeType: null,
  };

  if (!withReferenceImage || !preset.referencePath) {
    return base;
  }

  const extension = preset.referencePath.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = USABLE_REFERENCE_TYPES[extension];

  if (!mimeType) {
    return base;
  }

  try {
    const referenceImageUrl = await getSignedUrl(
      storagePathFromFullPath(preset.referencePath, IMAGES_BUCKET_NAME),
      REFERENCE_URL_TTL_MINUTES,
      IMAGES_BUCKET_NAME,
    );

    return { ...base, referenceImageUrl, referenceMimeType: mimeType };
  } catch (error) {
    // A reference deleted out from under the preset must not fail the whole
    // generation — the prose alone is still usable guidance, which is exactly
    // what every preset did before reference images were wired through.
    console.error(
      `Could not sign style reference for preset ${preset.id}:`,
      error,
    );

    return base;
  }
};
