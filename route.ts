import { Method, RequestHandler } from "./router.ts";

interface RouteHandler<Req, Res, Data> {
  method: Method;
  fn: RequestHandler<Req, Res, Data>;
}

interface MatchResult {
  taken: number;
  params: { [key: string]: string };
}

export abstract class RouteNode<Req, Res, Data> {
  raw: string;
  children: RouteNode<Req, Res, Data>[] = [];
  handler: RouteHandler<Req, Res, Data> | undefined;

  constructor(raw: string, handler?: RouteHandler<Req, Res, Data>) {
    this.raw = raw;
    this.handler = handler;
  }

  /**
   * Tries to match as many possible parts of a URL path to this node as possible.
   * @param parts The parts of the URL path to match.
   * @returns Information about how many parts of the URL path were matched and any params found.
   */
  abstract matchParts(parts: string[]): MatchResult | undefined;
}

// The root node of the router, should never be constructed by users.
export class RootNode<Req, Res, Data> extends RouteNode<Req, Res, Data> {
  constructor() {
    super("/");
  }

  matchParts(_: string[]): MatchResult | undefined {
    throw new Error("unreachable");
  }
}

// A node that represents a single part of the URL path that is a static string.
export class LiteralNode<Req, Res, Data> extends RouteNode<Req, Res, Data> {
  literal: string;

  constructor(
    literal: string,
    handler?: RouteHandler<Req, Res, Data>,
  ) {
    super(literal, handler);
    this.literal = literal;
  }

  matchParts(parts: string[]): MatchResult | undefined {
    if (parts[0] === this.literal) {
      return {
        taken: 1,
        params: {},
      };
    }
  }
}

type ParamModifier = "singular" | "optional" | "any" | "many";
const ModifierMap: Record<string, ParamModifier> = {
  "+": "many",
  "": "singular",
  "?": "optional",
  "*": "any",
};

// A node that represents a single part of the URL path that is a URL parameter.
export class ParamNode<Req, Res, Data> extends RouteNode<Req, Res, Data> {
  name: string;
  modifier: ParamModifier;

  constructor(
    name: string,
    modifier: ParamModifier,
    raw: string,
    handler?: RouteHandler<Req, Res, Data>,
  ) {
    super(raw, handler);
    this.name = name;
    this.modifier = modifier;
  }

  /**
   * Returns a ParamNode if the given string starts with : followed by a word and then a modifier.
   * @param text The string to parse.
   */
  static parse<Req, Res, Data>(
    text: string,
    handler?: RouteHandler<Req, Res, Data>,
  ): ParamNode<Req, Res, Data> | undefined {
    const match = text.match(/^:(\w+)(\?|\*|\+)?/);
    if (match) {
      return new ParamNode(
        match[1],
        ModifierMap[match[2] || ""],
        text,
        handler,
      );
    }
  }

  matchParts(parts: string[]): MatchResult | undefined {
    if (this.modifier === "singular" && parts.length > 0) {
      return {
        taken: 1,
        params: { [this.name]: parts[0] },
      };
    }

    if (this.modifier === "optional") {
      return {
        taken: parts.length > 0 ? 1 : 0,
        params: { [this.name]: parts[0] ?? "" },
      };
    }

    if (this.modifier === "many" && parts.length > 0) {
      return {
        taken: parts.length,
        params: { [this.name]: parts.join("/") },
      };
    }

    if (this.modifier === "any") {
      const joined = parts.join("/");
      return {
        taken: parts.length,
        params: { [this.name]: joined.length > 0 ? joined : "" },
      };
    }
  }
}

/**
 * Tries to register the a route at the given path in the route tree.
 * @param root The root node of the router.
 * @param path The path to register the route at.
 * @param method The method of the route.
 * @param handler The function used to handle requests to that route.
 * @throws If there is already a node registered that would conflict with the new route.
 */
export function buildRouteTree<Req, Res, Data>(
  root: RootNode<Req, Res, Data>,
  path: string,
  method: Method,
  handler: RequestHandler<Req, Res, Data>,
): void {
  const parts = path.split("/").filter((part) => part.length > 0);
  let current = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const matchingChild = current.children.find((child) => child.raw === part);
    const handlerForNode = i == parts.length - 1
      ? {
        fn: handler,
        method,
      }
      : undefined;

    if (matchingChild) {
      current = matchingChild;

      if (handlerForNode && current.handler === undefined) {
        current.handler = handlerForNode;
      }
    } else {
      const newChild = ParamNode.parse(part, handlerForNode) ??
        new LiteralNode(part, handlerForNode);

      if (
        i != parts.length - 1 &&
        newChild instanceof ParamNode &&
        (newChild.modifier == "any" || newChild.modifier == "many" ||
          newChild.modifier == "optional")
      ) {
        throw new Error(
          `Cannot have a param with modifier "${newChild.modifier}" anywhere but the end of the path.`,
        );
      }

      // If we're about to register a route with a handler, make sure there isn't a handler there
      // already that would conflict with the new route.
      if (handlerForNode) {
        if (
          newChild instanceof LiteralNode &&
          current.children.find((child) => child.raw === newChild.raw)
        ) {
          throw new Error(`Path conflicts with existing route`);
        }

        if (newChild instanceof ParamNode && current.children.find((child) => child.handler !== undefined)) {
            throw new Error("Path conflicts with existing route");
        }
      }

      current.children.push(newChild);
      // Make sure any literal nodes are at the start of the children list so they are matched first.
      // TODO: This is a bit of a hack, but it's the easiest way to ensure that the order, in the
      // future we might want to separate these into different lists.
      current.children.sort((a, _) => a instanceof LiteralNode ? -1 : 1);
      current = newChild;
    }
  }
}

export interface FoundRoute<Req, Res, Data> {
  handler: RequestHandler<Req, Res, Data>;
  params: Record<string, string>;
}

/**
 * Finds a matching route in the node tree provided.
 * @param root The root node of the router.
 * @param method The method of the HTTP request.
 * @param path The path of the HTTP request
 * @returns a FoundRoute if a route was found, otherwise undefined.
 */
export function findRoute<Req, Res, Data>(
  root: RootNode<Req, Res, Data>,
  method: Method,
  path: string,
): FoundRoute<Req, Res, Data> | undefined {
  const parts = path.split("/").filter((part) => part.length > 0);
  let current = root;
  let params = {};
  let i = 0;

  // While we still have parts to the path, try to go as far down in the tree as possible.
  while (i < parts.length) {
    const subslice = parts.slice(i);

    let foundChild = false;

    // Try to find a child that matches the next part of the path.
    for (const child of current.children) {
      const childMethod = child.handler?.method;

      // If we have a handler and our method doesn't match, we can't match.
      if (childMethod && childMethod != method) {
        continue;
      }

      const result = child.matchParts(subslice);
      if (!result) continue;

      current = child;
      i += result.taken;
      params = { ...params, ...result.params };
      foundChild = true;
      break;
    }

    // If we didn't find a matching child for that part, we can't progress any further in the tree.
    if (!foundChild) {
      break;
    }
  }

  // If we didn't find a handler, let's try to see if we have any children that are optional or any
  // length params.
  if (!current.handler) {
    for (const child of current.children) {
      const subslice = parts.slice(i);
      if (!(child instanceof ParamNode)) {
        continue;
      }

      const allowedModifiers = ["optional", "any"];
      if (!allowedModifiers.includes(child.modifier)) {
        continue;
      }

      const childMethod = child.handler?.method;

      // If we have a handler and our method doesn't match, we can't match.
      if (childMethod && childMethod != method) {
        continue;
      }

      const result = child.matchParts(subslice);
      if (!result) continue;

      current = child;
      i += result.taken;
      params = { ...params, ...result.params };
      break;
    }
  }

  if (current.handler) {
    return {
      handler: current.handler.fn,
      params,
    };
  }
}
