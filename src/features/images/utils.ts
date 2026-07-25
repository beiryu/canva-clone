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

  // Determine the type of input data
  if (imageData instanceof Blob) {
    // Case: Already a Blob object
    const contentType = fileType;
    const fileExt = contentType.split("/")[1] || "webp";
    const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

    return new File([imageData], finalFileName, { type: contentType });
  }

  if (typeof imageData !== "string") {
    throw new Error("Unsupported image data format");
  }

  // Handle string input types with switch case
  switch (true) {
    // Case 1: Remote URL
    case imageData.startsWith("http"): {
      const response = await fetch(imageData);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = fileType;
      const blob = await response.blob();
      const fileExt = contentType.split("/")[1] || "webp";
      const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

      return new File([blob], finalFileName, { type: contentType });
    }

    // Case 2: Base64 data URL
    case imageData.startsWith("data:"): {
      const [metaPart, dataPart] = imageData.split(",");
      const contentType = metaPart
        ? metaPart.match(/:(.*?);/)?.[1] || fileType
        : fileType;
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

    // Case 3: Raw base64 string with no data-URL prefix
    case /^[A-Za-z0-9+/=]+$/.test(imageData.trim()): {
      try {
        const contentType = fileType;
        const fileExt = contentType.split("/")[1] || "webp";
        const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

        // Convert base64 to binary
        const byteString = atob(imageData.trim());
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }

        const blob = new Blob([arrayBuffer], { type: contentType });
        return new File([blob], finalFileName, { type: contentType });
      } catch (error) {
        console.error("Error converting base64 string to file:", error);
        // If base64 decoding fails, fall through to the default case
      }
    }

    // Case 4: Plain string (likely URL from AI model output)
    default: {
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
}
