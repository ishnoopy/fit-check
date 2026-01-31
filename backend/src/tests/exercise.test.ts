import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("GET /api/health", () => {
  it("should return API is running message", async () => {
    const response = await app.request("/api/health");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ message: "API is running" });
  });
});
