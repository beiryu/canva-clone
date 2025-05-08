import { ImageAgent } from "./image-agent";
import { TextAgent } from "./text-agent";
import {
  ImageGenerationOptions,
  ImageGenerationResult,
  TextGenerationOptions,
  TextGenerationResult,
} from "./types";

export class AgentManager {
  private imageAgent: ImageAgent;
  private textAgent: TextAgent;

  constructor() {
    this.imageAgent = new ImageAgent();
    this.textAgent = new TextAgent();
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    return this.imageAgent.generateImage(options);
  }

  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    return this.textAgent.generateText(options);
  }

  getAvailableImageModels(): string[] {
    return this.imageAgent.getAvailableModels();
  }

  getAvailableTextModels(): string[] {
    return this.textAgent.getAvailableModels();
  }
}
