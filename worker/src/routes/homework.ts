import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getHomework } from "../db/homework";
import { notFound } from "../lib/errors";

export const homeworkRoutes = new Hono<AppEnv>();
homeworkRoutes.get("/sessions/:id/homework", async (c) => {
  const result = await getHomework(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  if (!result) throw notFound();
  return c.json(result);
});
