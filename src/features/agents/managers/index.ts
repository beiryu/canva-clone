import {
  EnhancePromptOptions,
  ImageGenerationOptions,
  ImageGenerationResult,
  RemoveBgOptions,
  RemoveBgResult,
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

  async enhancePrompt(
    options: EnhancePromptOptions,
  ): Promise<TextGenerationResult> {
    return this.textAgent.enhancePrompt(options);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    return this.backgroundRemoverAgent.removeBg(options);
  }
}
