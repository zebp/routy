import { Iter } from "https://deno.land/x/iterext@v1.1.1/mod.ts";

type Method =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "head"
  | "connect"
  | "option"
  | "trace";

export interface RequestInfo {
  path: string;
  fullPath: string;
  query: Record<string, string>;
}

export interface RequestContext extends RequestInfo {
  params: Record<string, string>;
}

export type RequestHandler<Req, Res, Data> = (
  req: Req,
  data: Data,
  context: RequestContext,
) => Promise<Res> | Res;

interface Route<Req, Res, Data> {
  method: Method;
  path: string;
  handler: RequestHandler<Req, Res, Data>;
}

export abstract class Router<Req, Res, Data = void> {
  #routes: Route<Req, Res, Data>[] = [];

  /**
   * Registers a route requiring the GET method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  get(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "get", handler);
  }

  /**
   * Registers a route requiring the POST method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  post(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "post", handler);
  }

  /**
   * Registers a route requiring the PUT method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  put(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "put", handler);
  }

  /**
   * Registers a route requiring the DELETE method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  delete(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "delete", handler);
  }

  /**
   * Registers a route requiring the PATCH method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  patch(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "patch", handler);
  }

  /**
   * Registers a route requiring the HEAD method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  head(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "head", handler);
  }

  /**
   * Registers a route requiring the CONNECT method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  connect(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "connect", handler);
  }

  /**
   * Registers a route requiring the OPTION method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  option(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "option", handler);
  }

  /**
   * Registers a route requiring the TRACE method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   */
  trace(path: string, handler: RequestHandler<Req, Res, Data>): this {
    return this.#register(path, "trace", handler);
  }

  abstract extractRequestInfo(req: Req): RequestInfo;

  abstract notFound(): Res;

  async route(req: Req, data: Data): Promise<Res> {
    const info = this.extractRequestInfo(req);

    this.#routes.forEach(() => {});

    for (const route of this.#routes) {
      const matches = tryMatchRoute(route.path, info.path);

      if (matches) {
        const context = { ...info, params: matches };
        const res = route.handler(req, data, context);

        if (res instanceof Promise) {
          return res;
        } else {
          return Promise.resolve(res);
        }
      }
    }

    return Promise.resolve(this.notFound());
  }

  #register(
    path: string,
    method: Method,
    handler: RequestHandler<Req, Res, Data>,
  ): this {
    this.#routes.push({ path, method, handler });
    return this;
  }
}

// TODO: Make this use some tree structure in the future.
export function tryMatchRoute(
  route: string,
  path: string,
): Record<string, string> | undefined {
  const routeSegements = new Iter(route.split("/")[Symbol.iterator]())
    .filter((seg) => seg != "")
    .map((seg) => seg.toLocaleLowerCase());
  const pathSegments = new Iter(path.split("/")[Symbol.iterator]())
    .filter((seg) => seg != "")
    .map((seg) => seg.toLocaleLowerCase());

  const params: Record<string, string> = {};
  const segments = routeSegements.zip(pathSegments);

  for (const [r, p] of segments) {
    if (r.startsWith(":")) {
      const paramName = r.substring(1);
      params[paramName] = p;
    } else if (r != p) {
      return undefined;
    }
  }

  // Ensure the route and the path don't have remaining segments;
  if (routeSegements.count() > 0) return undefined;
  if (pathSegments.count() > 0) return undefined;

  return params;
}
