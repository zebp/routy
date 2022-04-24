import { Method, RequestInfo, Router } from "./mod.ts";

export class WebRouter<Data = void> extends Router<Request, Response, Data> {
  extractRequestInfo(req: Request): RequestInfo {
    const url = new URL(req.url);
    const query: Record<string, string> = [
      ...url.searchParams.entries(),
    ].reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    const queryString = [...url.searchParams.entries()]
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    return {
      path: url.pathname,
      query,
      fullPath: `${url.pathname}?${queryString}`,
      method: req.method.toLowerCase() as Method,
    };
  }

  notFound(): Response {
    return new Response("not found", { status: 404 });
  }
}
