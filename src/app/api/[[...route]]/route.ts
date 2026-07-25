import { AuthConfig, initAuthConfig } from "@hono/auth-js";
import { Context, Hono } from "hono";
import { handle } from "hono/vercel";

import ai from "./ai";
import images from "./images";
import projects from "./projects";
import users from "./users";

import authConfig from "@/auth.config";

// Revert to "edge" if planning on running on the edge
export const runtime = "nodejs";

// Image generation blocks on replicate.wait(), which polls until the prediction
// finishes. Flux Kontext Pro and Pro Ultra routinely exceed the default
// serverless duration, which surfaces as an opaque 504 that looks like a model
// failure.
export const maxDuration = 300;

function getAuthConfig(c: Context): AuthConfig {
  return {
    secret: process.env.AUTH_SECRET,
    ...authConfig,
  } as AuthConfig;
}

const app = new Hono().basePath("/api");

app.use("*", initAuthConfig(getAuthConfig));

const routes = app
  .route("/ai", ai)
  .route("/users", users)
  .route("/images", images)
  .route("/projects", projects);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
