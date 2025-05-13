import {
  EnhancePromptOptions,
  ImageGenerationOptions,
  ImageGenerationResult,
  RemoveBgOptions,
  RemoveBgResult,
  TextGenerationOptions,
  TextGenerationResult,
} from "../types";
import { BackgroundRemoverAgent } from "./background-remover-agent";
import { ImageAgent } from "./image-agent";
import { TextAgent } from "./text-agent";

export class AgentManager {
  private imageAgent: ImageAgent;
  private textAgent: TextAgent;
  private backgroundRemoverAgent: BackgroundRemoverAgent;

  constructor() {
    this.imageAgent = new ImageAgent();
    this.textAgent = new TextAgent();
    this.backgroundRemoverAgent = new BackgroundRemoverAgent();
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

  async enhancePrompt(
    options: EnhancePromptOptions,
  ): Promise<TextGenerationResult> {
    return this.textAgent.enhancePrompt(options);
  }

  async editImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    return this.imageAgent.editImage(options);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    return this.backgroundRemoverAgent.removeBg(options);
  }

  getAvailableImageModels(): string[] {
    return this.imageAgent.getAvailableModels();
  }

  getAvailableTextModels(): string[] {
    return this.textAgent.getAvailableModels();
  }

  getAvailableBackgroundRemoverModels(): string[] {
    return this.backgroundRemoverAgent.getAvailableModels();
  }
}
