import { Hono } from "hono";
import type { AppEnv } from "../types";
import { listSlips } from "../db/comments";
import { notFound } from "../lib/errors";
import { slipForViewer } from "../db/slip-view";

export const commentsRoutes = new Hono<AppEnv>();
commentsRoutes.get("/sessions/:id/slips", async (c) => {
  const result = await listSlips(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  if (!result) throw notFound();
  const identity = c.get("identity");
  return c.json({ items: result.results.map((row) => slipForViewer(identity, row)) });
});
