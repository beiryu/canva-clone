import { supabaseAdmin } from "@/lib/supabase";
import {
  RequestUploadFile,
  RequestUploadRemoteImage,
  ResponseUploadedFile,
} from "../types";

export const IMAGES_BUCKET_NAME = "images";
export const TEMP_IMAGES_BUCKET_NAME = "temp-images";

const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;

export async function uploadFileToSupabase(
  request: RequestUploadFile,
): Promise<ResponseUploadedFile> {
  const {
    file,
    userId,
    projectId,
    prefix = "uploaded",
    bucketName = IMAGES_BUCKET_NAME,
  } = request;

  const fileName = `${prefix}_${Date.now()}_${file.name}`;
  const path = `${userId}/${projectId}/${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  };
}

export async function uploadRemoteImageToSupabase(
  request: RequestUploadRemoteImage,
): Promise<ResponseUploadedFile> {
  try {
    const {
      imageUrl,
      userId,
      projectId,
      prefix = "remote",
      bucketName = IMAGES_BUCKET_NAME,
    } = request;

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";

    // Remote hosts happily serve HTML error pages with a 200; storing one would
    // produce a file that silently fails to render later.
    if (!contentType.startsWith("image/")) {
      throw new Error(`Expected an image but got "${contentType}"`);
    }

    const blob = await response.blob();

    if (blob.size > MAX_REMOTE_IMAGE_BYTES) {
      throw new Error(
        `Image is too large (${Math.round(blob.size / 1024 / 1024)}MB, max ${MAX_REMOTE_IMAGE_BYTES / 1024 / 1024}MB)`,
      );
    }

    const fileName = `${prefix}_${Date.now()}.${contentType.split("/")[1] || "png"}`;
    const file = new File([blob], fileName, { type: contentType });

    const result = await uploadFileToSupabase({
      file,
      userId,
      projectId,
      prefix,
      bucketName,
    });

    return result;
  } catch (error) {
    console.error("Error uploading remote image:", error);
    throw new Error(
      `Failed to upload remote image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Generate a signed URL for a file in Supabase storage
 * @param path - The full path of the file in storage
 * @param expiresIn - Number of minutes until expiration
 * @param bucketName - The name of the bucket to use
 * @returns Promise<string> - A promise that resolves to a signed URL
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 60,
  bucketName: string = IMAGES_BUCKET_NAME,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn * 60);

  if (error) {
    console.error("Error generating signed URL:", error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
