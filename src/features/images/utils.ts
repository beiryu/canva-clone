export const getImageUrl = (fullPath: string): string => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fullPath}`;
};

/**
 * Converts various image outputs (URL, base64, blob) to a File object
 * @param imageData - The image data (URL string, base64 string, Blob)
 * @param options - Additional options for the file creation
 * @returns Promise<File> - A promise that resolves to a File object
 */
export async function convertToFile(
  imageData: string | Blob,
  options: {
    filePrefix?: string;
    fileName?: string;
    fileType?: string;
  } = {},
): Promise<File> {
  // Default options
  const {
    filePrefix = "generated",
    fileName = `image_${Date.now()}`,
    fileType = "image/webp",
  } = options;

  // Handle different input types
  if (typeof imageData === "string") {
    // Case 1: Remote URL
    if (imageData.startsWith("http")) {
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Get content type from response or use default
      const contentType = fileType;
      const blob = await response.blob();

      // Determine file extension from content type
      const fileExt = contentType.split("/")[1] || "webp";
      const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

      return new File([blob], finalFileName, { type: contentType });
    }

    // Case 2: Base64 data URL
    else if (imageData.startsWith("data:")) {
      const [dataPart] = imageData.split(",");

      // Extract MIME type from the meta part of data URL
      const contentType = fileType;
      const fileExt = contentType.split("/")[1] || "webp";
      const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

      // Convert base64 to binary
      const byteString = atob(dataPart);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([arrayBuffer], { type: contentType });
      return new File([blob], finalFileName, { type: contentType });
    }

    // Case 3: Plain string (likely URL from AI model output)
    else {
      // Assume it's a URL that can be fetched
      try {
        const response = await fetch(imageData);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const contentType = fileType;
        const blob = await response.blob();
        const fileExt = contentType.split("/")[1] || "webp";
        const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

        return new File([blob], finalFileName, { type: contentType });
      } catch (error) {
        // If not a valid URL, create a text file with the string data
        console.error("Error converting string to file:", error);
        return new File([imageData], `${fileName}.txt`, { type: "text/plain" });
      }
    }
  }
  // Case 4: Already a Blob object
  else if (imageData instanceof Blob) {
    const contentType = fileType;
    const fileExt = contentType.split("/")[1] || "webp";
    const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

    return new File([imageData], finalFileName, { type: contentType });
  }

  throw new Error("Unsupported image data format");
}
