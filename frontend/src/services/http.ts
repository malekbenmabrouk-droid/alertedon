export type ApiErrorKind = "http" | "network" | "timeout";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: ApiErrorKind = "http",
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound() {
    return this.status === 404;
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/** FastAPI returns either {detail: "..."} or {detail: [{loc, msg}, ...]} for validation errors. */
export function readDetail(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("detail" in body)) return fallback;
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: FastApiValidationItem) => {
        const field = d.loc?.filter((p) => p !== "body").join(".");
        return field ? `${field} : ${d.msg ?? "valeur invalide"}` : (d.msg ?? "valeur invalide");
      })
      .join(" · ");
  }
  return fallback;
}

export interface HttpOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function createHttp({ baseUrl, timeoutMs = 10_000, fetchImpl = fetch }: HttpOptions) {
  const root = baseUrl.replace(/\/$/, "");

  return async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(`${root}${path}`, {
        method,
        headers: body === undefined ? { Accept: "application/json" } : { "Content-Type": "application/json", Accept: "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new ApiError("Le serveur met trop de temps à répondre.", 0, "timeout");
      }
      throw new ApiError("API injoignable. Vérifiez que le serveur est démarré.", 0, "network");
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      // The dev proxy answers an empty 5xx (or a 502/504 page) when the backend is down.
      if (res.status >= 500 && (text === "" || (res.status >= 502 && res.status <= 504 && data === null))) {
        throw new ApiError("API injoignable. Vérifiez que le serveur est démarré.", res.status, "network");
      }
      throw new ApiError(readDetail(data, `Erreur ${res.status}`), res.status);
    }
    return data as T;
  };
}

export type HttpRequest = ReturnType<typeof createHttp>;
