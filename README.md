# Fix Gemini "400 Error" with LangChain.js + MCP [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/hideya/langchain-google-ex/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/@h1deya/langchain-google-ex.svg)](https://www.npmjs.com/package/@h1deya/langchain-google-ex)

### Drop-in replacement that unblocks MCP tool schemas in Gemini

This library provides **a drop-in replacement for `ChatGoogle` from `@langchain/google`**
that fixes Gemini 400 Bad Request errors when using LangChain.js with MCP servers.
It automatically transforms JSON schemas with unsupported constructs into Gemini-compatible
function-calling schemas at tool binding time.

The schema error usually looks like:

```text
Invalid JSON payload received. Unknown name "exclusiveMaximum" ...
```

or:

```text
Invalid JSON payload received. Unknown name "anyOf" ...
```

This commonly appears when tools from `MultiServerMCPClient` include schemas that are valid
JSON Schema but outside Gemini's supported OpenAPI-like subset.

## How to Use This Library

Replace:

```typescript
import { ChatGoogle } from "@langchain/google/node";

const model = new ChatGoogle({ model: "gemini-2.5-flash" });
```

with:

```typescript
import { ChatGoogleEx } from "@h1deya/langchain-google-ex";

const model = new ChatGoogleEx({ model: "gemini-2.5-flash" });
```

That's it. Keep passing the original MCP tools to LangChain:

```typescript
const mcpTools = await client.getTools();
const agent = createAgent({ model, tools: mcpTools });
```

`ChatGoogleEx` transforms the tool schemas inside `bindTools()`, preserving the original
LangChain tool objects and their execution behavior.

## Prerequisites

- Node.js 20+
- Google API key configured for `@langchain/google`
- `@langchain/google`, `langchain`, and `@langchain/mcp-adapters`
- MCP servers you want to use

Tested with `@langchain/google@0.2.3`, `langchain@1.5.10`, and
`@langchain/mcp-adapters@1.1.4`.

## Installation

```bash
npm i @h1deya/langchain-google-ex @langchain/google langchain @langchain/mcp-adapters
```

## Complete Usage Example

```typescript
import "dotenv/config";
import { ChatGoogleEx } from "@h1deya/langchain-google-ex";
import { createAgent } from "langchain";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
  throwOnLoadError: true,
  useStandardContentBlocks: true,
  mcpServers: {
    fetch: {
      transport: "stdio",
      command: "uvx",
      args: ["--with", "mcp<2", "mcp-server-fetch==2025.4.7"],
    },
  },
});

try {
  const mcpTools = await client.getTools();
  const model = new ChatGoogleEx({ model: "gemini-2.5-flash" });
  const agent = createAgent({ model, tools: mcpTools });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "Fetch the raw HTML content from bbc.com and tell me the title",
      },
    ],
  });

  console.log(result.messages.at(-1)?.content);
} finally {
  await client.close();
}
```

## Why This Happens

Gemini's function-calling schema format accepts only a subset of JSON Schema. Some MCP
servers publish schemas containing fields such as `exclusiveMinimum`, `exclusiveMaximum`,
`additionalProperties`, or complex `anyOf` / `oneOf` / `allOf` combinations. Those schemas
can be rejected before any tool call runs.

`@langchain/google` already performs some schema normalization, but current versions still
pass through schema keywords that Gemini rejects in MCP tool definitions. `ChatGoogleEx`
adds a compatibility layer for those cases.

MCP servers that have shown this kind of issue include:

- `airtable-mcp-server`
- `mcp-server-fetch==2025.4.7`
- `@notionhq/notion-mcp-server`

## Debugging: Verbose Logging

Set this environment variable to see schema transformations:

```bash
LANGCHAIN_GOOGLE_EX_VERBOSE=true
```

Example output:

```text
Transforming 3 MCP tool(s) for Gemini compatibility...
fetch: 2 exclusive bound(s) converted, 1 unsupported format(s) removed
Summary: 1/3 tool(s) required schema transformation
```

## Features

- Drop-in replacement for `ChatGoogle`
- Automatic MCP tool schema transformation at `bindTools()` time
- Preserves original LangChain tool objects
- Converts type arrays such as `["string", "null"]` to nullable schemas
- Filters invalid `required` fields
- Removes or converts unsupported JSON Schema keywords
- Resolves local `$ref`, `$defs`, and `definitions` where possible

## Known Limitations

- Unresolved references are simplified to generic object schemas.
- Tuple-style arrays keep only the first item schema.
- Non-string enum values are dropped.
- Complex `oneOf` / `allOf` schemas may be simplified, which can loosen validation.

These adjustments keep most MCP tools working, but rare edge cases could behave differently
from the original schema. Please report issues at
[GitHub Issues](https://github.com/hideya/langchain-google-ex/issues).

See [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) for implementation details.

## API Reference

[API Reference](https://hideya.github.io/langchain-google-ex/classes/ChatGoogleEx.html)

## Change Log

[CHANGELOG.md](https://github.com/hideya/langchain-google-ex/blob/main/CHANGELOG.md)

## License

[MIT](./LICENSE)
