import { Hono } from "hono";
import type { AppEnv } from "../types";
import { listScores, listTests } from "../db/tests-scores";
import { notFound } from "../lib/errors";

export const testsScoresRoutes = new Hono<AppEnv>();
testsScoresRoutes.get("/classes/:id/tests", async (c) => {
  const items = await listTests(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
    c.req.query("archived") === "1",
  );
  return c.json({ items });
});
testsScoresRoutes.get("/tests/:id/scores", async (c) => {
  const result = await listScores(
    c.env.DB,
    c.get("identity"),
    c.req.param("id"),
  );
  if (result === null) throw notFound();
  return c.json({ items: result.results });
});
