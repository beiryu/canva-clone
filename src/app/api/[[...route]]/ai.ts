import { verifyAuth } from "@hono/auth-js";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { AgentManager } from "@/features/agents/agent-manager";
import {
  ImageAspectRatio,
  ImageGenerationModel,
  ImageQuality,
} from "@/features/agents/types";
import { replicate } from "@/lib/replicate";

const app = new Hono()
  .post(
    "/remove-bg",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        image: z.string(),
      }),
    ),
    async (c) => {
      const { image } = c.req.valid("json");

      const input = {
        image: image,
      };

      const output: unknown = await replicate.run(
        "lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
        { input },
      );

      const res = output as string;

      return c.json({ data: res });
    },
  )
  .post(
    "/generate-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        prompt: z.string(),
      }),
    ),
    async (c) => {
      const { prompt } = c.req.valid("json");

      const input = {
        cfg: 3.5,
        steps: 28,
        prompt: prompt,
        aspect_ratio: "3:2",
        output_format: "webp",
        output_quality: 90,
        negative_prompt: "",
        prompt_strength: 0.85,
      };

      const output = await replicate.run("stability-ai/stable-diffusion-3", {
        input,
      });

      const res = output as Array<string>;

      return c.json({ data: res[0] });
    },
  )
  .post(
    "/generate-canvas-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        canvasImage: z.string(), // Base64 encoded image from canvas
        prompt: z.string().optional(),
        enhancePrompt: z.boolean().optional(),
        aspectRatio: z.string().optional(),
        quality: z.string().optional(),
        seed: z.string().optional(),
      }),
    ),
    async (c) => {
      const { canvasImage, prompt, enhancePrompt, aspectRatio, quality, seed } =
        c.req.valid("json");

      // Process the canvas image - we either use it directly or as inspiration
      // For now, we'll use the prompt-based generation as a starting point
      // and add the canvas image as a reference in the future

      let enhancedPrompt = prompt || "Digital art";

      if (enhancePrompt && prompt) {
        // In real implementation, you might want to call another AI service
        // to enhance the prompt based on the canvas content
        enhancedPrompt = `${prompt}, detailed, high quality, artistic`;
      }

      const input = {
        cfg: 3.5,
        steps: quality === "hd" ? 35 : 28,
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        output_format: "webp",
        output_quality: quality === "hd" ? 100 : 90,
        negative_prompt: "ugly, deformed, blurry, low quality, low resolution",
        prompt_strength: 0.85,
        seed: seed ? parseInt(seed) : undefined,
      };

      const output = await replicate.run("stability-ai/stable-diffusion-3", {
        input,
      });

      const res = output as Array<string>;

      return c.json({ data: res[0] });
    },
  )
  .post(
    "/agent-generate-image",
    verifyAuth(),
    zValidator(
      "json",
      z.object({
        prompt: z.string(),
        model: z.string(),
        canvasImage: z.string().optional(),
        enhancePrompt: z.boolean().optional(),
        aspectRatio: z.string().optional(),
        quality: z.string().optional(),
        seed: z.number().optional(),
      }),
    ),
    async (c) => {
      const {
        prompt,
        model,
        canvasImage,
        enhancePrompt,
        aspectRatio,
        quality,
        seed,
      } = c.req.valid("json");

      // Initialize the agent manager with API keys from env
      const agentManager = new AgentManager();

      try {
        const result = await agentManager.generateImage({
          prompt,
          model: model as ImageGenerationModel,
          canvasImage,
          enhancePrompt,
          aspectRatio: aspectRatio as ImageAspectRatio,
          quality: quality as ImageQuality,
          seed: seed,
        });

        return c.json({ data: result.url });
      } catch (error) {
        console.error("Image generation error:", error);
        return c.json({ error: "Failed to generate image" }, 500);
      }
    },
  );

export default app;
