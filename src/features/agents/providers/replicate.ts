import { convertToFile } from "@/features/images/utils";
import { replicate } from "@/lib/replicate";
import { BaseModelHandler } from "../model-handler";
import {
  AgentProvider,
  AutoPromptOptions,
  BackgroundRemoverHandler,
  ImageGenerationHandler,
  ImageGenerationOptions,
  ImageGenerationResult,
  ModelCapability,
  ModelHandler,
  RemoveBgOptions,
  RemoveBgResult,
  StyleAnalysisHandler,
  StyleAnalysisOptions,
  StyleAnalysisResult,
  TextGenerationHandler,
  TextGenerationResult,
} from "../types";
import {
  buildImagePrompt,
  firstOutputUri,
  joinTextOutput,
  orderInputImages,
} from "../utils";

/**
 * Official Replicate models are addressed by `owner/name` and passed as
 * `model:`, which hits POST /models/{owner}/{name}/predictions. `version:` is
 * for pinned version hashes and hits POST /predictions instead — passing a
 * bare name there sends a name where a hash belongs.
 */
const REPLICATE_SLUGS = {
  "seedream-5-lite": "bytedance/seedream-5-lite",
} as const;

// Model handler for Seedream 5 Lite — text-to-image plus sketch editing.
class Seedream5LiteHandler
  extends BaseModelHandler
  implements ImageGenerationHandler
{
  constructor() {
    super("seedream-5-lite", ["image-generation"]);
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    try {
      const {
        prompt,
        settings,
        canvasImage,
        style,
        styleInstruction,
        styleReferenceImage,
      } = options;

      const { aspectRatio = "1:1", strictness = "moderate" } = settings;

      const inputImages = orderInputImages({ canvasImage, styleReferenceImage });

      const input = {
        prompt: buildImagePrompt({
          prompt,
          style,
          styleInstruction,
          strictness,
          withImageGuidance: Boolean(canvasImage),
          withStyleReference: Boolean(styleReferenceImage),
        }),
        aspect_ratio: aspectRatio,
        size: "2K",
        output_format: "png",
        // "auto" would let the model decide to emit a batch of related images;
        // the gallery expects exactly one. Two *inputs* do not change that.
        sequential_image_generation: "disabled",
        // An array of URIs, in the same order the [INPUT IMAGES] block
        // describes. Omit it entirely when there is nothing to attach — an
        // empty array is not the same as an absent key. Replicate fetches each
        // URL itself and sniffs the bytes, so no MIME needs passing here.
        ...(inputImages.length
          ? { image_input: inputImages.map((image) => image.uri) }
          : {}),
      };

      console.log("Generating image with Seedream 5 Lite", input);

      const prediction = await replicate.predictions.create({
        model: REPLICATE_SLUGS["seedream-5-lite"],
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "seedream-5-lite", fileType: "image/png" },
      );

      return {
        file,
        providerName: "replicate",
        providerImageId: prediction.id,
      };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

class LabsBackgroundRemoverHandler
  extends BaseModelHandler
  implements BackgroundRemoverHandler
{
  constructor() {
    super("labs/background-remover", ["background-remover"]);
  }

  async removeBg(options: RemoveBgOptions): Promise<RemoveBgResult> {
    try {
      const { image } = options;

      const input = {
        image,
      };

      console.log("Removing background with Background Remover", input);

      // Pinned to a version hash, so `version:` is correct here.
      const prediction = await replicate.predictions.create({
        version:
          "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      // fileType is not optional in practice: convertToFile's http branch
      // stamps whatever type it is handed and ignores the response header, so
      // omitting it labelled these PNGs image/webp. This model exists to
      // produce an alpha channel, which makes it the worst one to mislabel.
      const file = await convertToFile(
        firstOutputUri(completedPrediction.output, this.model),
        { filePrefix: "background-remover", fileType: "image/png" },
      );

      return { file };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

/**
 * Janus-Pro-7B is a small VLM, so the question stays short and concrete —
 * asking it for a long structured document makes it drift or loop. It is asked
 * only for the *look* of the reference; the constant thumbnail-composition
 * rules are appended by the caller, where they cannot be forgotten.
 *
 * "Do not describe the subject" is load-bearing, and more so now that the
 * reference image itself is attached at generation time: with the subject
 * described here too, it would bleed into the output through both the picture
 * and the prose. What widened instead is the *rendering* detail — framing,
 * edges, and type treatment — since that is what the prose is for.
 */
const STYLE_ANALYSIS_QUESTION =
  "Describe the visual style of this image so it can be reproduced on a " +
  "completely different subject. Cover: the rendering technique, the colour " +
  "palette with specific colours, the lighting, the texture and level of " +
  "detail, the contrast, how edges and outlines are treated, how the frame is " +
  "composed and how depth is suggested, and — if any text appears — how that " +
  "text is styled. Write one dense paragraph of visual descriptors. " +
  "Do NOT describe the subject or what is happening in the image.";

class JanusProStyleHandler
  extends BaseModelHandler
  implements StyleAnalysisHandler
{
  constructor() {
    super("janus-pro-7b", ["style-analysis"]);
  }

  async analyzeStyle(
    options: StyleAnalysisOptions,
  ): Promise<StyleAnalysisResult> {
    try {
      const { image } = options;

      const input = {
        image,
        question: STYLE_ANALYSIS_QUESTION,
        // The model default of 0.1 sends it into repetition loops
        // ("evocative, visually striking, evocative, ..."). 0.7 is the lowest
        // value that produced clean output in testing.
        temperature: 0.7,
        top_p: 0.95,
      };

      console.log("Analyzing reference style with Janus Pro 7B");

      // Pinned to a version hash — this is a community-published model, so the
      // `model:` endpoint 404s for it.
      const prediction = await replicate.predictions.create({
        version:
          "deepseek-ai/janus-pro-7b:fbf6eb41957601528aab2b3f6d37a287015d9f486c3ac4ec6e80f04744ac1a32",
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const instruction = joinTextOutput(
        completedPrediction.output,
        this.model,
      ).trim();

      if (!instruction) {
        throw new Error("Style analysis returned an empty description");
      }

      return { instruction };
    } catch (error) {
      console.error("Error with Replicate API:", error);
      throw error;
    }
  }
}

/**
 * Deliberately thin. This used to prescribe the thumbnail — hero subject, high
 * contrast, and "deliberate negative space for a headline" — and that last
 * clause is why generated thumbnails came back wordless: it is an instruction
 * to leave the headline out, so the model dutifully left it out even when the
 * canvas had text on it. Describing what is there beats dictating a layout;
 * the composition is the model's call now.
 */
const AUTO_PROMPT_SYSTEM =
  "You write prompts for AI image generators that produce high-performing " +
  "YouTube thumbnails. Study the user's canvas and write ONE image-generation " +
  "prompt for the thumbnail it is meant to become. Describe what is actually " +
  "on the canvas, text included, and judge the rest yourself. A visual style " +
  "is applied separately after your prompt, so describe the subject and the " +
  "scene and leave the rendering style out. Reply with the prompt only - no " +
  "preamble, no markdown.";

/**
 * Style guidance is one dense paragraph plus the fixed composition rules
 * appended in the style-presets route — 250-350 tokens against a ~226-token
 * baseline for the whole request. The writer only needs the palette and
 * technique descriptors at the head of it to avoid contradicting the style, so
 * the tail is dropped rather than doubling the input for a weaker signal.
 */
const STYLE_CONTEXT_MAX_CHARS = 600;

/**
 * Turns the current canvas into a thumbnail prompt. Qwen2-VL is a single-turn
 * image+text model (no separate system role), so the system instruction and
 * context sections are folded into one `prompt` string.
 */
class Qwen2VLAutoPromptHandler
  extends BaseModelHandler
  implements TextGenerationHandler
{
  constructor() {
    super("qwen2-vl-7b-instruct", ["text-generation"]);
  }

  async autoPrompt(options: AutoPromptOptions): Promise<TextGenerationResult> {
    const { canvasImage, context, styleName, styleInstruction } = options;

    try {
      const trimmedContext = context?.trim();
      const trimmedInstruction = styleInstruction?.trim();

      const styleContext = trimmedInstruction
        ? `Style applied afterwards${styleName ? ` (${styleName})` : ""}: ` +
          trimmedInstruction.slice(0, STYLE_CONTEXT_MAX_CHARS)
        : styleName
          ? `Style applied afterwards: ${styleName}`
          : null;

      const sections = [
        trimmedContext ? `Video topic / notes: ${trimmedContext}` : null,
        styleContext,
        "Here is my canvas.",
      ].filter(Boolean);

      const input = {
        media: canvasImage,
        prompt: [AUTO_PROMPT_SYSTEM, ...sections].join("\n\n"),
        max_new_tokens: 300,
      };

      console.log("Writing auto prompt with Qwen2-VL 7B Instruct");

      // Pinned to a version hash — this is a community-published model, so the
      // `model:` endpoint 404s for it.
      const prediction = await replicate.predictions.create({
        version:
          "lucataco/qwen2-vl-7b-instruct:bf57361c75677fc33d480d0c5f02926e621b2caa2000347cb74aeae9d2ca07ee",
        input,
      });

      const completedPrediction = await replicate.wait(prediction);

      const text = joinTextOutput(completedPrediction.output, this.model).trim();

      if (!text) {
        throw new Error("Qwen2-VL returned no prompt text");
      }

      return { text };
    } catch (error) {
      console.error("Error generating auto prompt:", error);
      throw error;
    }
  }
}

export class ReplicateProvider implements AgentProvider {
  name = "replicate";
  supportedCapabilities: ModelCapability[] = [
    "image-generation",
    "background-remover",
    "style-analysis",
    "text-generation",
  ];

  private modelHandlers: Map<string, ModelHandler> = new Map();

  constructor() {
    this.registerHandler(new Seedream5LiteHandler());
    this.registerHandler(new LabsBackgroundRemoverHandler());
    this.registerHandler(new JanusProStyleHandler());
    this.registerHandler(new Qwen2VLAutoPromptHandler());
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

/**
 * Handlers are stateless, so share one provider instance. AgentManager builds
 * three agents per request, each of which would otherwise construct its own
 * provider and full handler set.
 */
let cachedProvider: ReplicateProvider | null = null;

export const getReplicateProvider = (): ReplicateProvider =>
  (cachedProvider ??= new ReplicateProvider());
