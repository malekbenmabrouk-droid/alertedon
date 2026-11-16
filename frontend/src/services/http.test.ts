import { describe, expect, it, vi } from "vitest";
import { ApiError, createHttp, readDetail } from "./http";

const reply = (status: number, body: string) =>
  vi.fn().mockResolvedValue(new Response(body, { status, headers: { "Content-Type": "application/json" } }));

describe("readDetail", () => {
  it("returns FastAPI business messages as is", () => {
    expect(readDetail({ detail: "Centre 4 introuvable" }, "x")).toBe("Centre 4 introuvable");
  });

  it("flattens validation errors with their field", () => {
    const body = { detail: [{ loc: ["body", "quantite"], msg: "Input should be greater than 0" }] };
    expect(readDetail(body, "x")).toBe("quantite : Input should be greater than 0");
  });

  it("falls back when the body has no detail", () => {
    expect(readDetail(null, "Erreur 500")).toBe("Erreur 500");
  });
});

describe("createHttp", () => {
  it("prefixes the base URL and sends JSON", async () => {
    const fetchImpl = reply(201, JSON.stringify({ id: 1 }));
    const http = createHttp({ baseUrl: "/api/", fetchImpl });
    await expect(http("POST", "/centres", { nom: "CNTS" })).resolves.toEqual({ id: 1 });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("/api/centres");
    expect(init.body).toBe('{"nom":"CNTS"}');
  });

  it("turns business errors into ApiError with the server message", async () => {
    const http = createHttp({ baseUrl: "/api", fetchImpl: reply(422, JSON.stringify({ detail: "Délai non respecté" })) });
    const err = await http("POST", "/dons", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, kind: "http", message: "Délai non respecté" });
  });

  it("reports an unreachable server as a network error", async () => {
    const http = createHttp({ baseUrl: "/api", fetchImpl: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });
    await expect(http("GET", "/sante")).rejects.toMatchObject({ kind: "network", status: 0 });
  });

  it("treats an empty 5xx from the dev proxy as a network error", async () => {
    const http = createHttp({ baseUrl: "/api", fetchImpl: reply(500, "") });
    await expect(http("GET", "/sante")).rejects.toMatchObject({ kind: "network" });
  });
});
