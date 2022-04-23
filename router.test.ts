import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.126.0/testing/asserts.ts";
import { tryMatchRoute } from "./router.ts";

Deno.test({
  name: "basic",
  fn() {
    const matches = tryMatchRoute("/a/b", "/a/b");
    assert(matches !== undefined);
    assertEquals(tryMatchRoute("/a/b", "/a/c"), undefined);
  },
});

Deno.test({
  name: "params",
  fn() {
    const matches = tryMatchRoute("/a/:second", "/a/b");
    assert(matches !== undefined);
    assertEquals(matches.second, "b");
  },
});
5;

Deno.test({
  name: "with double slash",
  fn() {
    assert(tryMatchRoute("/a/b", "/a//b") !== undefined);
    assert(tryMatchRoute("/a//b", "/a/b") !== undefined);
    assert(tryMatchRoute("/a//b", "/a//b") !== undefined);
  },
});
