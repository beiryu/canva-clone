import { openai } from "@/lib/openai";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  EnhancePromptOptions,
  ImageAspectRatio,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
  TextGenerationHandler,
  TextGenerationOptions,
  TextGenerationResult,
} from "../types";
import { convertToFile } from "@/features/images/utils";
import {
  createSketchGuidanceInstruction,
  createStyleInstruction,
} from "../utils";

// Model handler for GPT-Image-1
class GPTImageHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("o/gpt-image-1", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const { prompt, settings, style = "nature" } = options;

    const {
      aspectRatio = "1:1",
      quality = "high",
      strictness = "moderate",
    } = settings;

    const guidanceInstruction = createSketchGuidanceInstruction(strictness);
    const styleInstruction = createStyleInstruction(style);

    try {
      const input = {
        model: "gpt-image-1",
        prompt: `
        [SKETCH GUIDANCE] ${guidanceInstruction}
        [STYLE GUIDANCE] ${styleInstruction}
        [USER PROMPT] ${prompt}
        `,
        size: this.mapAspectRatioToSize(aspectRatio),
        quality: this.mapQuality(quality),
      };

      console.log("Generating image with OpenAI GPT-Image-1", input);

      const response = await openai.images.generate(input);

      if (!response || !response.data || response.data.length === 0) {
        throw new Error("Invalid response format from OpenAI");
      }

      const file = await convertToFile(response.data[0].b64_json as string, {
        filePrefix: "o/gpt-image-1",
      });

      return { file };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      throw error;
    }
  }

  async editImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    throw new Error("Editing images is not supported for OpenAI GPT-Image-1");
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
class GPT4TextHandler
  extends BaseModelHandler
  implements TextGenerationHandler
{
  constructor() {
    super("gpt-4", ["text-generation"]);
  }

  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    const { temperature = 0.7, maxTokens = 500 } = options;

    let systemPrompt = "You are a helpful AI assistant.";
    let userContent =
      "Please generate a text prompt for an image generation model.";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        temperature: temperature,
        max_tokens: maxTokens,
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("Invalid response format from OpenAI");
      }

      const generatedText = response.choices[0].message.content || "";

      return { text: generatedText };
    } catch (error) {
      console.error("Error calling OpenAI for text generation:", error);
      throw error;
    }
  }

  async enhancePrompt(
    options: EnhancePromptOptions,
  ): Promise<TextGenerationResult> {
    const { currentPrompt } = options;

    const systemPrompt =
      "You are an expert at crafting detailed, creative prompts for AI image generation. Your task is to enhance user prompts to make them more descriptive, visually rich, and specific, while preserving the original intent. Add artistic style details, lighting, composition elements, and other visual attributes that would make the image more compelling. Keep the enhanced prompt concise but detailed.";
    const userContent = `Please enhance this image generation prompt: "${currentPrompt}"`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error("Invalid response format from OpenAI");
      }

      const enhancedPrompt =
        response.choices[0].message.content || currentPrompt;
      return { text: enhancedPrompt };
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      throw error;
    }
  }
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
