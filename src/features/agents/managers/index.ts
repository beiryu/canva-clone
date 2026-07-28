import {
  AutoPromptOptions,
  ImageGenerationOptions,
  ImageGenerationResult,
  RemoveBgOptions,
  RemoveBgResult,
  StyleAnalysisOptions,
  StyleAnalysisResult,
  TextGenerationResult,
} from "../types";
import { BackgroundRemoverAgent } from "./background-remover-agent";
import { ImageAgent } from "./image-agent";
import { StyleAgent } from "./style-agent";
import { TextAgent } from "./text-agent";

export class AgentManager {
  private imageAgent: ImageAgent;
  private textAgent: TextAgent;
  private backgroundRemoverAgent: BackgroundRemoverAgent;
  private styleAgent: StyleAgent;

  constructor() {
    this.imageAgent = new ImageAgent();
    this.textAgent = new TextAgent();
    this.backgroundRemoverAgent = new BackgroundRemoverAgent();
    this.styleAgent = new StyleAgent();
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    return this.imageAgent.generateImage(options);
  }

  async autoPrompt(options: AutoPromptOptions): Promise<TextGenerationResult> {
    return this.textAgent.autoPrompt(options);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    return this.backgroundRemoverAgent.removeBg(options);
  }

  async analyzeStyle(
    options: StyleAnalysisOptions,
  ): Promise<StyleAnalysisResult> {
    return this.styleAgent.analyzeStyle(options);
  }
}
