import { convertToFile } from "@/features/images/utils";
import { getOpenAIClient } from "@/lib/openai";
import { BaseModelHandler } from "../model-handler";
import { GPT_IMAGE_SIZES } from "../model-ids";
import {
  AgentProvider,
  AutoPromptOptions,
  ImageAspectRatio,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ImageQuality,
  ModelCapability,
  ModelHandler,
  TextGenerationHandler,
  TextGenerationResult,
} from "../types";
import { buildImagePrompt } from "../utils";

const GPT_IMAGE_MODEL = "gpt-image-2";

/**
 * OpenAI surfaces content-policy rejections as a structured API error. The
 * route's generic "Failed to generate image" would bury the reason, so the
 * message is lifted out here and rethrown.
 */
const rethrowWithReason = (error: unknown): never => {
  const message =
    error && typeof error === "object" && "error" in error
      ? ((error as { error?: { message?: string } }).error?.message ?? null)
      : null;

  if (message) {
    throw new Error(`OpenAI rejected the request: ${message}`);
  }

  throw error;
};

class GPTImage2Handler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super(GPT_IMAGE_MODEL, ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    const { prompt, settings, canvasImage, style, styleInstruction } = options;

    const {
      aspectRatio = "1:1",
      quality = "medium",
      strictness = "moderate",
    } = settings;

    try {
      const openai = getOpenAIClient();

      const size = this.mapAspectRatioToSize(aspectRatio);

      const composedPrompt = buildImagePrompt({
        prompt,
        style,
        styleInstruction,
        strictness,
        withImageGuidance: Boolean(canvasImage),
      });

      console.log("Generating image with GPT Image 2", {
        size,
        quality,
        withSketch: Boolean(canvasImage),
      });

      // With a sketch this is an edit, not a generation. `ai.ts` hands over a
      // signed Supabase URL, so it is pulled back down into a File — the edits
      // endpoint takes bytes, not a URL. That extra hop keeps the route
      // provider-agnostic instead of special-casing OpenAI upstream.
      const response = canvasImage
        ? await openai.images.edit({
            model: GPT_IMAGE_MODEL,
            image: await convertToFile(canvasImage, {
              filePrefix: "canvas",
              fileType: "image/png",
            }),
            prompt: composedPrompt,
            size,
            quality: this.mapQuality(quality),
            // input_fidelity is deliberately omitted: gpt-image-2 processes
            // every input at high fidelity and rejects the parameter.
          })
        : await openai.images.generate({
            model: GPT_IMAGE_MODEL,
            prompt: composedPrompt,
            size,
            quality: this.mapQuality(quality),
            output_format: "png",
          });

      const b64 = response.data?.[0]?.b64_json;

      if (!b64) {
        throw new Error("OpenAI returned no image data");
      }

      const file = await convertToFile(b64, {
        // No slash in the prefix — it becomes part of the Supabase object name
        // and a "/" there would silently nest the upload under a new folder.
        filePrefix: "gpt-image-2",
        fileType: "image/png",
      });

      return { file, providerName: "openai" };
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      return rethrowWithReason(error);
    }
  }

  private mapQuality(quality: ImageQuality): "low" | "medium" | "high" {
    // IMAGE_QUALITIES is low|medium|high, which gpt-image-2 accepts verbatim.
    return quality;
  }

  private mapAspectRatioToSize(aspectRatio: ImageAspectRatio): string {
    const size = GPT_IMAGE_SIZES[aspectRatio];

    if (!size) {
      throw new Error(`No gpt-image-2 size mapped for ratio "${aspectRatio}"`);
    }

    return size;
  }
}

const AUTO_PROMPT_MODEL = "gpt-5.4-mini";

const AUTO_PROMPT_SYSTEM =
  "You write prompts for AI image generators that produce high-performing " +
  "YouTube thumbnails. Study the user's canvas and write ONE image-generation " +
  "prompt that turns it into a click-worthy thumbnail: clear hero subject, " +
  "high contrast, readable when small.\n" +
  "Headline rules:\n" +
  "- When headline text is supplied, the prompt MUST tell the image model to " +
  "render it. Reproduce each headline inside double quotes exactly as given - " +
  "same characters, same accents and diacritics, same capitalization - and " +
  "state that it has to be spelled exactly as written. Then describe its " +
  "placement, size, weight, color and contrast against the background. Never " +
  "translate, shorten, rephrase or re-case a headline, and never ask for empty " +
  "space where that headline goes.\n" +
  "- When no headline text is supplied, do not invent one: ask instead for " +
  "deliberate clean negative space where a headline can be added later.\n" +
  "Reply with the prompt only - no preamble, no markdown, and no quotes " +
  "wrapped around the prompt as a whole.";

/**
 * Turns the current canvas into a thumbnail prompt.
 *
 * Lives on the OpenAI provider rather than Replicate because this is a vision
 * task: the model has to actually look at the drawing. The DeepSeek text model
 * this replaced could not.
 */
class GPT54MiniAutoPromptHandler
  extends BaseModelHandler
  implements TextGenerationHandler
{
  constructor() {
    super(AUTO_PROMPT_MODEL, ["text-generation"]);
  }

  async autoPrompt(options: AutoPromptOptions): Promise<TextGenerationResult> {
    const { canvasImage, context, canvasText } = options;

    try {
      const openai = getOpenAIClient();

      const trimmedContext = context?.trim();
      const headlines = (canvasText ?? [])
        .map((line) => line.trim())
        .filter(Boolean);

      const sections: string[] = [];

      if (trimmedContext) {
        sections.push(`Video topic / notes: ${trimmedContext}`);
      }

      // Numbered and quoted so the model has an unambiguous span to copy. It is
      // told these are authoritative because the same strings are also visible
      // (blurrily) in the snapshot, and the transcription it would make from
      // the pixels must lose to the exact one.
      if (headlines.length) {
        sections.push(
          "Headline text to render, authoritative and exact - copy it " +
            "character for character, do not re-read it from the image:\n" +
            headlines.map((line, i) => `${i + 1}. "${line}"`).join("\n"),
        );
      }

      sections.push("Here is my canvas.");

      const response = await openai.chat.completions.create({
        model: AUTO_PROMPT_MODEL,
        messages: [
          { role: "system", content: AUTO_PROMPT_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                // The topic goes before the image: tested, it steers the result
                // without overriding what is actually drawn.
                text: sections.join("\n\n"),
              },
              { type: "image_url", image_url: { url: canvasImage } },
            ],
          },
        ],
        // Observed output is ~120 tokens, so this is headroom, not a squeeze.
        max_completion_tokens: 300,
        // No `temperature` — the verified request omits it and gpt-5.x rejects
        // some legacy sampling params.
      });

      const text = response.choices[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("OpenAI returned no prompt text");
      }

      return { text };
    } catch (error) {
      console.error("Error generating auto prompt:", error);
      return rethrowWithReason(error);
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
    this.registerHandler(new GPTImage2Handler());
    this.registerHandler(new GPT54MiniAutoPromptHandler());
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

/** Handlers are stateless, so share one provider instance — see replicate.ts. */
let cachedProvider: OpenAIProvider | null = null;

export const getOpenAIProvider = (): OpenAIProvider =>
  (cachedProvider ??= new OpenAIProvider());
