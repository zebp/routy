import {
  assert,
  assertEquals,
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
