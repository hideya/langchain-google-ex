# Design Decision: Why We Chose the Drop-in Replacement Approach

## Summary

`@h1deya/langchain-google-ex` solves Gemini schema compatibility issues for MCP tools
used with `ChatGoogle` from `@langchain/google`.

We evaluated two approaches:

- **Option A**: expose an explicit `transformMcpToolsForGemini()` utility
- **Option B**: expose a drop-in replacement class, `ChatGoogleEx`

We chose **Option B** as the public API.

## The Problem We're Solving

Gemini function calling accepts only a subset of JSON Schema. MCP servers may publish tool
schemas containing fields such as `anyOf`, `oneOf`, `allOf`, `exclusiveMinimum`,
`exclusiveMaximum`, unsupported `format` values, or invalid `required` entries.

Those schemas can produce errors such as:

```text
Invalid JSON payload received. Unknown name "exclusiveMaximum" ...
```

or:

```text
Invalid JSON payload received. Unknown name "anyOf" ...
```

## Why Transforming Inside `bindTools()` Works Best

LangChain agents keep tool objects as more than raw schemas. A tool object also carries its
name, description, invocation behavior, lifecycle metadata, and runtime state. Transforming
too early risks replacing or reshaping the tool object before LangChain has finished its own
processing.

With a drop-in model class, users keep writing normal LangChain code:

```typescript
import { ChatGoogleEx } from "@h1deya/langchain-google-ex";
import { createAgent } from "langchain";

const mcpTools = await client.getTools();
const model = new ChatGoogleEx({ model: "gemini-2.5-flash" });
const agent = createAgent({ model, tools: mcpTools });
```

The transformation happens only when LangChain calls:

```typescript
model.bindTools(mcpTools);
```

That timing preserves LangChain's normal tool lifecycle while adapting the final schemas
sent to Gemini.

## Public API

The package intentionally exports only:

```typescript
import { ChatGoogleEx } from "@h1deya/langchain-google-ex";
```

The schema adapter remains internal. This keeps the package focused on the supported
drop-in replacement workflow and avoids encouraging premature manual transformation.

## Conclusion

The drop-in replacement approach:

- fixes Gemini schema rejection without changing application structure
- preserves MCP tool execution behavior
- keeps migration reversible when upstream schema handling improves
- keeps the package API small and hard to misuse
