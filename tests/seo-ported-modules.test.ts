import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { config } from "../src/config/app.config";
import { createApp } from "../src/app";
import { Backlink } from "../src/models/backlink.model";

describe("Ported SEO Modules (Backlinks, AI Content, Keyword Planner)", () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoUri);
    }
  });

  afterAll(async () => {
    await Backlink.deleteMany({ targetUrl: "https://ensis.in/test-audit" });
  });

  it("1. GET /api/seo/backlinks returns items and stats", async () => {
    const res = await request(app).get("/api/seo/backlinks");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(typeof res.body.stats.total).toBe("number");
  });

  it("2. POST /api/seo/backlinks/create creates a backlink", async () => {
    const res = await request(app)
      .post("/api/seo/backlinks/create")
      .send({
        targetUrl: "https://ensis.in/test-audit",
        sourceUrl: "https://ayurveda-journal.com/review",
        anchorText: "Ensis Panchkarma Droni Bed",
        type: "dofollow",
        daScore: 35,
        status: "active",
      });
    expect(res.status).toBe(201);
    expect(res.body.data?.targetUrl).toBe("https://ensis.in/test-audit");
  });

  it("3. POST /api/seo/content-audit audits content without mock", async () => {
    const res = await request(app)
      .post("/api/seo/content-audit")
      .send({
        text: "Ensis is an authentic Indian manufacturer of luxury Panchkarma massage beds, shirodhara tables, and ayurvedic steam chambers.",
        targetKeyword: "panchkarma massage bed",
      });
    expect(res.status).toBe(200);
    expect(res.body.wordCount).toBeGreaterThan(10);
    expect(typeof res.body.aiScore).toBe("number");
    expect(typeof res.body.verdict).toBe("string");
  });

  it("4. POST /api/seo/keyword-planner plans keywords for Ensis domain", async () => {
    const res = await request(app)
      .post("/api/seo/keyword-planner")
      .send({
        seedKeyword: "panchkarma bed",
        mode: "ai",
      });
    expect(res.status).toBe(200);
    const keywords = res.body.keywords || res.body.data?.keywords;
    expect(Array.isArray(keywords)).toBe(true);
    expect(keywords.length).toBeGreaterThan(0);
  });
});

