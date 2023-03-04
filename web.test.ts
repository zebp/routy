import {
  assertEquals,
  fail,
} from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { WebRouter } from "./web.ts";

Deno.test({
  name: "basic",
  async fn() {
    const router = new WebRouter();

    router.get("/sync", () => new Response("Hello, world!"));
    router.get("/async", () => Promise.resolve(new Response("Hello, world!")));

    const syncResp = await router.route(new Request("http://localhost/sync"));
    assertEquals(await syncResp.text(), "Hello, world!");

    const asyncResp = await router.route(new Request("http://localhost/async"));
    assertEquals(await asyncResp.text(), "Hello, world!");
  },
});

Deno.test({
  name: "not found",
  async fn() {
    const router = new WebRouter();

    const resp = await router.route(
      new Request("http://localhost/doesnt-exist"),
    );
    assertEquals(resp.status, 404);
    assertEquals(await resp.text(), "not found");
  },
});

Deno.test({
  name: "overloading",
  async fn() {
    const router = new WebRouter()
      .get("/api/post/:id", (_req, _data, ctx) => new Response(ctx.params.id))
      .get("/api/post/latest", () => new Response("This is the latest post!"));

    const respLatest = await router.route(
      new Request("http://localhost/api/post/latest"),
    );
    assertEquals(await respLatest.text(), "This is the latest post!");
    const respParam = await router.route(
      new Request("http://localhost/api/post/some_id"),
    );
    assertEquals(await respParam.text(), "some_id");
  },
});

Deno.test({
  name: "middleware",
  async fn() {
    const middlewareCalls: string[] = [];
    const router = new WebRouter()
      .middleware(async (req, data, ctx, next) => {
        middlewareCalls.push("a");
        return await next(req, data, ctx);
      })
      .middleware(async (req, data, ctx, next) => {
        middlewareCalls.push("b");
        return await next(req, data, ctx);
      })
      .get(
        "/api/post/:id",
        (_req, _data, ctx) => new Response(ctx.params.id),
        () => fail("middleware should not have been called."),
      )
      .get(
        "/api/post/latest",
        () => new Response("This is the latest post!"),
        async (req, data, ctx, next) => {
          middlewareCalls.push("c");
          return await next(req, data, ctx);
        },
      );

    const respLatest = await router.route(
      new Request("http://localhost/api/post/latest"),
    );
    assertEquals(await respLatest.text(), "This is the latest post!");

    // Ensure both middlewares are called in the correct order.
    assertEquals(middlewareCalls, ["a", "b", "c"]);
  },
});
