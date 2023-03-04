import { buildRouteTree, findRoute, RootNode } from "./route.ts";

export type Method =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "head"
  | "connect"
  | "options"
  | "trace";

export interface RequestInfo {
  path: string;
  fullPath: string;
  query: Record<string, string>;
  method: Method;
}

export interface RequestContext extends RequestInfo {
  params: Record<string, string>;
}

export type RequestHandler<Req, Res, Data> = (
  req: Req,
  data: Data,
  context: RequestContext,
) => Promise<Res> | Res;

export type Middleware<Req, Res, Data> = (
  req: Req,
  data: Data,
  context: RequestContext,
  next: RequestHandler<Req, Res, Data>,
) => Promise<Res> | Res;

export abstract class Router<Req, Res, Data = void> {
  #root = new RootNode<Req, Res, Data>();
  #middleware: Middleware<Req, Res, Data>[] = [];

  /**
   * Registers a route requiring the GET method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  get(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "get", handler, middleware);
  }

  /**
   * Registers a route requiring the POST method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  post(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "post", handler, middleware);
  }

  /**
   * Registers a route requiring the PUT method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  put(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "put", handler, middleware);
  }

  /**
   * Registers a route requiring the DELETE method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  delete(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "delete", handler, middleware);
  }

  /**
   * Registers a route requiring the PATCH method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  patch(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "patch", handler, middleware);
  }

  /**
   * Registers a route requiring the HEAD method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  head(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "head", handler, middleware);
  }

  /**
   * Registers a route requiring the CONNECT method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  connect(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "connect", handler, middleware);
  }

  /**
   * Registers a route requiring the OPTION method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  options(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "options", handler, middleware);
  }

  /**
   * Registers a route requiring the TRACE method.
   * @param path the path patter that requests must match to get routed.
   * @param handler a function responsible for handling the request.
   * @param middleware any middlewares that should wrap the route.
   */
  trace(
    path: string,
    handler: RequestHandler<Req, Res, Data>,
    ...middleware: Middleware<Req, Res, Data>[]
  ): this {
    return this.#register(path, "trace", handler, middleware);
  }

  /**
   * Registers a middleware that will wrap any routes.
   * @param middleware the function responsible for wrapping a route and propagating the request.
   */
  middleware(middleware: Middleware<Req, Res, Data>): this {
    this.#middleware = [middleware, ...this.#middleware];
    return this;
  }

  abstract extractRequestInfo(req: Req): RequestInfo;

  abstract notFound(): Promise<Res> | Res;

  /**
   * Routes an incoming request with any provided data to a route if found or responds with
   * {@link notFound}.
   * @param req The incoming request.
   * @param data Any shared data to be provided to the route.
   * @returns A response.
   */
  route(req: Req, data: Data): Promise<Res> {
    const info = this.extractRequestInfo(req);
    const foundRoute = findRoute(this.#root, info.method, info.path);

    if (foundRoute) {
      const wrappedHandler = this.#middleware.reduce<
        RequestHandler<Req, Res, Data>
      >(
        (next, middleware) => (req, data, ctx) =>
          ensurePromise(middleware(req, data, ctx, next)),
        (
          req,
          data,
          ctx,
        ) => ensurePromise(foundRoute.handler(req, data, ctx)),
      );

      return ensurePromise(wrappedHandler(req, data, {
        ...info,
        params: foundRoute.params,
      }));
    }

    return Promise.resolve(this.notFound());
  }

  #register(
    path: string,
    method: Method,
    handler: RequestHandler<Req, Res, Data>,
    middlewares: Middleware<Req, Res, Data>[],
  ): this {
    const wrappedHandler = middlewares.reduce<RequestHandler<Req, Res, Data>>(
      (next, middleware) => (req, data, ctx) =>
        ensurePromise(middleware(req, data, ctx, next)),
      (
        req,
        data,
        ctx,
      ) => ensurePromise(handler(req, data, ctx)),
    );

    buildRouteTree(this.#root, path, method, wrappedHandler);
    return this;
  }
}

const ensurePromise = <T>(maybePromise: T | Promise<T>) => {
  if (maybePromise instanceof Promise) {
    return maybePromise;
  } else {
    return Promise.resolve(maybePromise);
  }
};
