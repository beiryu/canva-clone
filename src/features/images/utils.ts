export const getImageUrl = (fullPath: string): string => {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fullPath}`;
};

/** What a stored object is named when its path carries no usable extension. */
const FALLBACK_IMAGE_EXTENSION = "png";

/**
 * Extension of a stored object, for naming a download after it.
 *
 * A download's name has to follow the bytes rather than a hard-coded guess:
 * naming a PNG `.webp` produces a file that previews fine in a browser (which
 * sniffs the bytes) but that other tools reject outright.
 *
 * `split(".").pop()` returns the whole string when there is no dot at all, so
 * the result is shape-checked rather than trusted.
 */
export const imageExtensionFromPath = (fullPath: string): string => {
  const extension = fullPath.split(".").pop()?.toLowerCase() ?? "";

  return /^[a-z0-9]{2,4}$/.test(extension)
    ? extension
    : FALLBACK_IMAGE_EXTENSION;
};

/**
 * Only the first few KB are examined. Testing `/^[A-Za-z0-9+/=]+$/` against a
 * whole payload overflows V8's regex stack once the string reaches a few
 * megabytes — which is exactly what an image model returns when it hands back
 * base64 rather than a URL (a 2MP PNG is ~4MB of base64). The decode below is
 * wrapped in try/catch, so a heuristic here is safe.
 */
const BASE64_SNIFF_LENGTH = 4096;

const looksLikeBase64 = (value: string): boolean => {
  if (value.length === 0 || value.length % 4 !== 0) return false;

  return /^[A-Za-z0-9+/=]+$/.test(value.slice(0, BASE64_SNIFF_LENGTH));
};

/**
 * Buffer decodes in native code; the charCodeAt loop it replaces ran once per
 * byte (millions of iterations per image). The loop is kept as a fallback for
 * any non-Node runtime.
 */
const decodeBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const byteString = atob(value);
  const bytes = new Uint8Array(byteString.length);

  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  return bytes;
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
  const {
    filePrefix = "generated",
    fileName = `image_${Date.now()}`,
    fileType = "image/webp",
  } = options;

  if (imageData instanceof Blob) {
    const contentType = fileType;
    const fileExt = contentType.split("/")[1] || "webp";
    const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

    return new File([imageData], finalFileName, { type: contentType });
  }

  if (typeof imageData !== "string") {
    throw new Error("Unsupported image data format");
  }

  switch (true) {
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

    case imageData.startsWith("data:"): {
      const [metaPart, dataPart] = imageData.split(",");
      const contentType = metaPart
        ? metaPart.match(/:(.*?);/)?.[1] || fileType
        : fileType;
      const fileExt = contentType.split("/")[1] || "webp";
      const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

      const blob = new Blob([decodeBase64(dataPart)], { type: contentType });
      return new File([blob], finalFileName, { type: contentType });
    }

    case looksLikeBase64(imageData.trim()): {
      try {
        const contentType = fileType;
        const fileExt = contentType.split("/")[1] || "webp";
        const finalFileName = `${filePrefix}_${Date.now()}.${fileExt}`;

        const blob = new Blob([decodeBase64(imageData.trim())], {
          type: contentType,
        });
        return new File([blob], finalFileName, { type: contentType });
      } catch (error) {
        console.error("Error converting base64 string to file:", error);
        // If base64 decoding fails, fall through to the default case
      }
    }

    // Most likely a plain URL emitted by an AI model.
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
