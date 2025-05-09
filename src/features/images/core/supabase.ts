import { supabase } from "@/lib/supabase";
import {
  RequestUploadFile,
  RequestUploadRemoteImage,
  ResponseUploadedFile,
} from "../types";

const BUCKET_NAME = "images";

/**
 * Upload a file to Supabase storage
 */
export async function uploadFileToSupabase(
  request: RequestUploadFile,
): Promise<ResponseUploadedFile> {
  const { file, userId, projectId, prefix = "uploaded" } = request;

  const fileName = `${prefix}_${Date.now()}_${file.name}`;
  const path = `${userId}/${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return {
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
    const { imageUrl, userId, projectId, prefix = "remote" } = request;

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
    });

    return result;
  } catch (error) {
    console.error("Error uploading remote image:", error);
    throw new Error(
      `Failed to upload remote image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
