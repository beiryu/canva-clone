import { supabase } from "@/lib/supabase";
import {
  RequestUploadFile,
  RequestUploadRemoteImage,
  ResponseUploadedFile,
} from "../types";

export const IMAGES_BUCKET_NAME = "images";
export const TEMP_IMAGES_BUCKET_NAME = "temp-images";

/**
 * Upload a file to Supabase storage
 */
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

  const { data, error } = await supabase.storage
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

/**
 * Download remote image and upload it to Supabase storage
 */
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

    // Fetch the image from the remote URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the content type and create a blob
    const contentType = response.headers.get("content-type") || "image/png";
    const blob = await response.blob();

    // Create a file from the blob
    const fileName = `${prefix}_${Date.now()}.${contentType.split("/")[1] || "png"}`;
    const file = new File([blob], fileName, { type: contentType });

    // Upload to Supabase
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
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresIn * 60); // Convert minutes to seconds

  if (error) {
    console.error("Error generating signed URL:", error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
