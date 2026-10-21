import { Hono } from "hono";
import type { AppEnv } from "../types";
import { listSlips } from "../db/comments";
import { notFound } from "../lib/errors";

export const commentsRoutes = new Hono<AppEnv>();
commentsRoutes.get("/sessions/:id/slips", async (c) => {
  const result = await listSlips(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  if (!result) throw notFound();
  return c.json({ items: result.results });
});
