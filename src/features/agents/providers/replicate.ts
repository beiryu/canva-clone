import { convertToFile } from "@/features/images/utils";
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
  RemoveBgOptions,
  RemoveBgResult,
} from "../types";
import {
  createSketchGuidanceInstruction,
  createStyleInstruction,
} from "../utils";

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
      const { prompt, settings, style = "nature" } = options;

      const {
        aspectRatio = "1:1",
        quality = "medium",
        strictness = "moderate",
      } = settings;

      const guidanceInstruction = createSketchGuidanceInstruction(strictness);
      const styleInstruction = createStyleInstruction(style);

      const input = {
        prompt: `
        [SKETCH GUIDANCE] ${guidanceInstruction}
        [STYLE GUIDANCE] ${styleInstruction}
        [USER PROMPT] ${prompt}
        `,
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
    super("r/gpt-image-1", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, canvasImage, style = "nature" } = options;

      const {
        aspectRatio = "1:1",
        quality = "medium",
        strictness = "moderate",
      } = settings;

      // Create prompt with sketch guidance if available
      const guidanceInstruction = createSketchGuidanceInstruction(strictness);
      const styleInstruction = createStyleInstruction(style);

      const input = {
        prompt: `
        [SKETCH GUIDANCE] ${guidanceInstruction}
        [STYLE GUIDANCE] ${styleInstruction}
        [USER PROMPT] ${prompt}
        `,
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

// Model handler for Flux Pro Ultra
class FluxProUltraHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("flux-pro-ultra", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const { prompt, settings, style = "nature" } = options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      // Create prompt with sketch guidance if available
      const guidanceInstruction = createSketchGuidanceInstruction(strictness);
      const styleInstruction = createStyleInstruction(style);

      const input = {
        prompt: `
        [SKETCH GUIDANCE] ${guidanceInstruction}
        [STYLE GUIDANCE] ${styleInstruction}
        [USER PROMPT] ${prompt}
        `,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
      };

      console.log("Generating image with Flux Pro Ultra", input);

      const output = await replicate.run(
        "black-forest-labs/flux-1.1-pro-ultra",
        {
          input,
        },
      );

      const result = output as unknown as string;

      if (!result) {
        throw new Error("Invalid output from Replicate");
      }

      const file = await convertToFile(result, {
        filePrefix: "flux-pro-ultra",
      });

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }

  async editImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    throw new Error("Editing images is not supported for Flux Schnell");
  }
}

// Model handler for Background Remover
class BackgroundRemoverHandler
  extends BaseModelHandler
  implements BackgroundRemoverHandler
{
  constructor() {
    super("851-labs/background-remover", ["background-remover"]);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    try {
      const { image } = options;

      const input = {
        image,
      };

      console.log("Removing background with Background Remover", input);

      const output = await replicate.run(
        "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        {
          input,
        },
      );

      const result = output as unknown as string;

      if (!result) {
        throw new Error("Invalid output from Replicate");
      }

      const file = await convertToFile(result, {
        filePrefix: "background-remover",
      });

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
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
    this.registerHandler(new ReplicateGPTImageHandler());
    this.registerHandler(new FluxProUltraHandler());
    this.registerHandler(new BackgroundRemoverHandler());
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
