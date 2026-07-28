import OpenAI from "openai";

/**
 * Constructed lazily on first use, not at module load.
 *
 * The OpenAI SDK throws from its constructor when no key is configured
 * ("Missing credentials..."). This module sits in the import chain
 * AgentManager -> ImageAgent -> providers/openai, so an eager client would
 * throw during module initialisation and take down *every* image generation —
 * including the Replicate models, which need no OpenAI key at all.
 *
 * Deferring construction keeps a missing key contained to the OpenAI code path,
 * where it surfaces as an actionable error instead of a blanket 500.
 */
let client: OpenAI | null = null;

export const getOpenAIClient = (): OpenAI => {
  if (client) return client;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local — note that GPT Image " +
        "models also require a verified OpenAI organization.",
    );
  }

  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return client;
};
