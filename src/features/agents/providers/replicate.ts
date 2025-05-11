import { replicate } from "@/lib/replicate";
import { convertToFile } from "@/features/images/utils";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
} from "../types";
import { formatPromptWithStyle } from "../utils";

// Model handler for Flux Schnell
class FluxSchnellHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("flux-schnell", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, style } = options;

      const { aspectRatio = "1:1", quality = "medium" } = settings;

      const input = {
        prompt: formatPromptWithStyle(prompt, style),
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: this.mapQuality(quality),
      };

      console.log("Generating image with Flux Schnell", input);

      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input,
      });

      const result = output as Array<string>;

      if (!result || !result[0]) {
        throw new Error("Invalid output from Replicate");
      }

      const file = await convertToFile(result[0], {
        filePrefix: "flux-schnell",
      });

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }

  private mapQuality(quality: ImageQuality): number {
    switch (quality) {
      case "low":
        return 60;
      case "medium":
        return 80;
      case "high":
        return 100;
      default:
        return 80;
    }
  }

  async editImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    throw new Error("Editing images is not supported for Flux Schnell");
  }
}

class ReplicateGPTImageHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("replicate/gpt-image", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, canvasImage, style } = options;

      const { aspectRatio = "1:1", quality = "medium" } = settings;

      const input = {
        prompt: formatPromptWithStyle(prompt, style),
        quality: this.mapQuality(quality),
        aspect_ratio: aspectRatio,
        input_images: canvasImage ? [canvasImage] : [],
        output_format: "webp",
        openai_api_key: process.env.OPENAI_API_KEY!,
      };

      console.log("Generating image with Replicate GPT Image", {
        ...input,
        openai_api_key: "REDACTED",
      });

      const output = await replicate.run("openai/gpt-image-1", {
        input,
      });

      const result = output as Array<string>;

      if (!result || !result[0]) {
        throw new Error("Invalid output from Replicate");
      }

      const file = await convertToFile(result[0], {
        filePrefix: "replicate-gpt-image",
      });

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }

  private mapQuality(quality?: ImageQuality): "low" | "medium" | "high" {
    if (!quality) return "high"; // Default to high if not specified
    return quality;
  }

  async editImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    throw new Error("Editing images is not supported for Replicate GPT Image");
  }
}

export class ReplicateProvider implements AgentProvider {
  name = "replicate";
  supportedCapabilities: ModelCapability[] = ["image-generation"];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    // Initialize handlers for each model
    this.registerHandler(new FluxSchnellHandler());
    this.registerHandler(new ReplicateGPTImageHandler());
  }

  private registerHandler(handler: ModelHandler): void {
    this.modelHandlers.set(handler.model, handler);
  }

  getModelHandler(model: string): ModelHandler {
    const handler = this.modelHandlers.get(model);
    if (!handler) {
      throw new Error(`No handler found for model: ${model}`);
    }
    return handler;
  }
}
