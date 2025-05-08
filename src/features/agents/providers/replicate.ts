import { replicate } from "@/lib/replicate";
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
      console.log("Generating image with Flux Schnell", options);

      const input = {
        prompt: options.prompt,
        aspect_ratio: options.aspectRatio || "1:1",
        output_format: "webp",
        output_quality: this.mapQuality(options.quality),
        seed: options.seed,
      };

      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input,
      });

      const result = output as Array<string>;

      if (!result || !result[0]) {
        throw new Error("Invalid output from Replicate");
      }

      return {
        url: result[0],
        model: "flux-schnell",
        prompt: options.prompt,
      };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }

  private mapQuality(quality?: ImageQuality): number {
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
}

export class ReplicateProvider implements AgentProvider {
  name = "replicate";
  supportedCapabilities: ModelCapability[] = ["image-generation"];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    // Initialize handlers for each model
    this.registerHandler(new FluxSchnellHandler());
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
