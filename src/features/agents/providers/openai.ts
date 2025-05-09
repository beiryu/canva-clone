import { openai } from "@/lib/openai";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  ImageAspectRatio,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
} from "../types";
import { convertToFile } from "@/features/images/utils";
// Model handler for GPT-Image-1
class GPTImageHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("gpt-image-1", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const { prompt, settings } = options;

    const { aspectRatio = "1:1", quality = "high" } = settings;

    try {
      const input = {
        model: "gpt-image-1",
        prompt: prompt,
        size: this.mapAspectRatioToSize(aspectRatio),
        quality: this.mapQuality(quality),
      };

      console.log("Generating image with GPT-Image-1", input);

      const response = await openai.images.generate(input);

      if (!response || !response.data || response.data.length === 0) {
        throw new Error("Invalid response format from OpenAI");
      }

      const file = await convertToFile(response.data[0].b64_json as string, {
        filePrefix: "gpt-image-1",
      });

      return { file };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw error;
    }
  }

  private mapQuality(quality?: ImageQuality): "low" | "medium" | "high" {
    if (!quality) return "high"; // Default to high if not specified
    return quality;
  }

  private mapAspectRatioToSize(aspectRatio?: ImageAspectRatio): any {
    switch (aspectRatio) {
      case "1:1":
        return "1024x1024";
      case "3:2":
        return "1536x1024";
      case "2:3":
        return "1024x1536";
      default:
        return "1024x1024";
    }
  }
}

// GPT-4 text model handler
class GPT4TextHandler extends BaseModelHandler {
  constructor() {
    super("gpt-4", ["text-generation"]);
  }

  // Add text generation methods here
}

export class OpenAIProvider implements AgentProvider {
  name = "openai";
  supportedCapabilities: ModelCapability[] = [
    "image-generation",
    "text-generation",
  ];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    // Initialize handlers for each model
    this.registerHandler(new GPTImageHandler());
    this.registerHandler(new GPT4TextHandler());
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
