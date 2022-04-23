# routy

A simple and extendable Router for Node, Deno, and Cloudflare Workers.

## Example

```typescript
import { WebRouter } from "@zebp/routy";

const router = new WebRouter().get(
  "/greet/:name",
  (_req, _data, ctx) => new Response(`Hello, ${ctx.params.name}!`)
);

const response = await router.route(
  new Request("https://example.com/greet/user")
);
```
