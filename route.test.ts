import {
  assert,
  assertEquals,
  assertExists,
  assertThrows,
} from "https://deno.land/std@0.126.0/testing/asserts.ts";
import {
  buildRouteTree,
  findRoute,
  LiteralNode,
  ParamNode,
  RootNode,
} from "./route.ts";

Deno.test({
  name: "parse param node single",
  fn() {
    const node = ParamNode.parse(":single");
    assertExists(node);
    assertEquals(node.name, "single");
    assertEquals(node.modifier, "singular");
  },
});

Deno.test({
  name: "parse param node optional",
  fn() {
    const node = ParamNode.parse(":optional?");
    assertExists(node);
    assertEquals(node.name, "optional");
    assertEquals(node.modifier, "optional");
  },
});

Deno.test({
  name: "parse param node many",
  fn() {
    const node = ParamNode.parse(":many+");
    assertExists(node);
    assertEquals(node.name, "many");
    assertEquals(node.modifier, "many");
  },
});

Deno.test({
  name: "parse param node any",
  fn() {
    const node = ParamNode.parse(":any*");
    assertExists(node);
    assertEquals(node.name, "any");
    assertEquals(node.modifier, "any");
  },
});

Deno.test({
  name: "route tree with literal nodes",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/literal", "get", () => {});
    const firstChild = root.children.find((child) => child.raw === "literal");
    assertExists(firstChild);
    assert(firstChild instanceof LiteralNode);
    assertEquals(firstChild.literal, "literal");

    buildRouteTree(root, "/literal/child", "get", () => {});
    const secondChild = firstChild.children.find((child) =>
      child.raw === "child"
    );
    assertExists(secondChild);
    assert(secondChild instanceof LiteralNode);
    assertEquals(secondChild.literal, "child");

    buildRouteTree(root, "/secondTopLiteral", "get", () => {});
    const thirdChild = root.children.find((child) =>
      child.raw === "secondTopLiteral"
    );
    assertExists(thirdChild);
    assert(thirdChild instanceof LiteralNode);
    assertEquals(thirdChild.literal, "secondTopLiteral");
  },
});

Deno.test({
  name: "add route after child",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/literal/test", "get", () => {});
    buildRouteTree(root, "/literal", "get", () => {});
    const firstChild = root.children.find((child) => child.raw === "literal");
    assertExists(firstChild);
    assertExists(firstChild.hasHandlers);
  },
});

Deno.test({
  name: "conflicting routes",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/literal", "get", () => {});
    assertThrows(() => buildRouteTree(root, "/:param", "get", () => {}));
  },
});

Deno.test({
  name: "overload path with literal",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/api/post/:post/comments", "get", () => {});
    buildRouteTree(root, "/api/post/latest/comments", "get", () => {});

    // Ensure we match with the path that has a literal.
    assertEquals(
      findRoute(root, "get", "/api/post/latest/comments")?.params,
      {},
    );
  },
});

Deno.test({
  name: "route tree with param nodes",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/:param", "get", () => {});
    const first = root.children[0];
    assertExists(first);
    assert(first instanceof ParamNode);
    assertEquals(first.name, "param");
    assertEquals(first.modifier, "singular");

    root = new RootNode();
    buildRouteTree(root, "/optional/:param?", "get", () => {});
    const second = root.children[0]?.children[0];
    assertExists(second);
    assert(second instanceof ParamNode);
    assertEquals(second.name, "param");
    assertEquals(second.modifier, "optional");

    root = new RootNode();
    buildRouteTree(root, "/api/:param", "get", () => {});
    const third = root.children[0]?.children[0];
    assertExists(third);
    assert(third instanceof ParamNode);
    assertEquals(third.name, "param");
    assertEquals(third.modifier, "singular");

    root = new RootNode();
    buildRouteTree(root, "/:newParam/thingy", "get", () => {});
    const fourth = root.children[0];
    assertExists(fourth);
    assert(fourth instanceof ParamNode);
    assertEquals(fourth.name, "newParam");
    assertEquals(fourth.modifier, "singular");
    const fifth = fourth.children[0];
    assertExists(fifth);
    assert(fifth instanceof LiteralNode);
    assertEquals(fifth.literal, "thingy");

    // Ensure we can't do any modifiers but singular in the middle of the path
    assertThrows(() =>
      buildRouteTree(new RootNode(), "/:newParam?/thingy", "get", () => {})
    );
    assertThrows(() =>
      buildRouteTree(new RootNode(), "/:newParam+/thingy", "get", () => {})
    );
    assertThrows(() =>
      buildRouteTree(new RootNode(), "/:newParam*/thingy", "get", () => {})
    );
  },
});

Deno.test({
  name: "route path",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/a/b", "get", () => {});
    buildRouteTree(root, "/params/:test", "get", () => {});
    buildRouteTree(root, "/paramsOptional/:test?", "get", () => {});
    buildRouteTree(root, "/paramsMany/:test+", "get", () => {});
    buildRouteTree(root, "/paramsAny/:test*", "get", () => {});

    assertExists(findRoute(root, "get", "/a/b"));
    assertEquals(
      findRoute(root, "get", "/params/test")?.params?.["test"],
      "test",
    );
    assertEquals(
      findRoute(root, "get", "/paramsOptional/test")?.params?.["test"],
      "test",
    );
    assertEquals(
      findRoute(root, "get", "/paramsOptional")?.params?.["test"],
      "",
    );
    assertEquals(
      findRoute(root, "get", "/paramsMany/test")?.params?.["test"],
      "test",
    );
    assertEquals(
      findRoute(root, "get", "/paramsMany/test/testing")?.params?.["test"],
      "test/testing",
    );

    assertEquals(
      findRoute(root, "get", "/paramsAny/test")?.params?.["test"],
      "test",
    );
    assertEquals(
      findRoute(root, "get", "/paramsAny/test/testing")?.params?.["test"],
      "test/testing",
    );
    assertEquals(findRoute(root, "get", "/paramsAny")?.params?.["test"], "");
  },
});

Deno.test({
  name: "different methods",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/test", "get", () => {});
    buildRouteTree(root, "/test", "post", () => {});

    assertExists(findRoute(root, "get", "/test"));
    assertExists(findRoute(root, "post", "/test"));

    root = new RootNode();

    buildRouteTree(root, "/:test", "get", () => {});
    buildRouteTree(root, "/:test", "post", () => {});

    assertExists(findRoute(root, "get", "/test"));
    assertExists(findRoute(root, "post", "/test"));
  },
});

Deno.test({
  name: "root routes",
  fn() {
    let root = new RootNode();

    buildRouteTree(root, "/", "get", () => {});
    assertExists(findRoute(root, "get", "/"));
  },
});
