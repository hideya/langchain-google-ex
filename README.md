# Fix Gemini schema errors with LangChain.js + MCP [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/hideya/langchain-google-ex/blob/main/LICENSE) [![npm version](https://img.shields.io/npm/v/@h1deya/langchain-google-ex.svg)](https://www.npmjs.com/package/@h1deya/langchain-google-ex)

### Drop-in replacement that unblocks MCP tool schemas in Gemini

This library provides **a drop-in replacement for `ChatGoogle` from `@langchain/google`**
that fixes Gemini function-calling schema errors when using LangChain.js with MCP servers.
It automatically transforms MCP tool schemas with unsupported constructs into
Gemini-compatible function-calling schemas at tool binding time.

The schema error usually appears as either a Gemini API request error:

```text
RequestError: Invalid JSON payload received.
Unknown name "exclusiveMaximum" ...
Unknown name "exclusiveMinimum" ...
```

or a LangChain-side schema validation error before the request is sent:

```text
InvalidInputError: Gemini does not support union types in function schemas.
Use a single type instead.
```

This commonly appears when tools from `MultiServerMCPClient` include schemas that are valid
JSON Schema but outside Gemini's supported OpenAPI-like subset.

## How to Use This Library

Replace:

```typescript
import { ChatGoogle } from "@langchain/google/node";

const model = new ChatGoogle({ model: "gemini-3.5-flash" });
```

with:

```typescript
import { ChatGoogleEx } from "@h1deya/langchain-google-ex";

const model = new ChatGoogleEx({ model: "gemini-3.5-flash" });
```

That's it. Keep passing the original MCP tools to LangChain:

```typescript
const mcpTools = await client.getTools();
const agent = createAgent({ model, tools: mcpTools });
```

`ChatGoogleEx` transforms the tool schemas inside `bindTools()`, preserving the original
LangChain tool objects and their execution behavior.

When using a Google AI Studio / Gemini Developer API key, pass it explicitly:

```typescript
const model = new ChatGoogleEx({
  model: "gemini-3.5-flash",
  apiKey: process.env.GOOGLE_API_KEY,
});
```

This avoids accidentally falling back to Vertex AI / Google Cloud authentication when the
environment is not configured the way `@langchain/google` expects.

A simple usage example, which is ready to clone and run, can be found
[here](https://github.com/hideya/langchain-google-ex-usage).

> This library is intentionally focused on `@langchain/google` users who need a
> drop-in replacement for `ChatGoogleAI`. If you use `@langchain/google-genai`, see the companion
> [`@h1deya/langchain-google-genai-ex`](https://www.npmjs.com/package/@h1deya/langchain-google-genai-ex)
> package instead.
>
> This library addresses compatibility issues present as of August 25, 2026, with 
> `langchain` v1.5.10, `@langchain/google` v0.2.3, and `@langchain/mcp-adapters` v1.1.4.

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
// import { ChatGoogle } from "@langchain/google/node";
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

(async () => { // workaround for top-level await
  try {
    const mcpTools = await client.getTools();
    // const model = new ChatGoogle({
    const model = new ChatGoogleEx({
      model: "gemini-3.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
    });
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
})();
```

A simple usage example, which is ready to clone and run, can be found
[here](https://github.com/hideya/langchain-google-ex-usage).

## Why The Error Happens

Gemini's function-calling schema format accepts only a subset of JSON Schema. Some MCP
servers publish schemas containing fields such as `exclusiveMinimum`, `exclusiveMaximum`,
`propertyNames`, `additionalProperties`, or complex union shapes. Those schemas can be
rejected before any tool call runs.

`@langchain/google` already performs some schema normalization, but current versions still
pass through schema keywords that Gemini rejects in MCP tool definitions. `ChatGoogleEx`
adds a compatibility layer for those cases.

MCP servers that have shown this kind of issue include:

- `airtable-mcp-server`
- `mcp-server-fetch==2025.4.7`
- GitHub Copilot MCP server
- `@notionhq/notion-mcp-server`

In local integration tests, simple schemas such as a weather MCP server worked with both
`ChatGoogle` and `ChatGoogleEx`. More complex schemas from Fetch, Airtable, and GitHub
failed with `ChatGoogle` and succeeded with `ChatGoogleEx`.

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

## Links

- [A simple usage example](https://github.com/hideya/langchain-google-ex-usage) which is ready to clone and run
- [Design decision document](./DESIGN_DECISIONS.md) describes the implementation details

## License

[MIT](./LICENSE)

## Contributing

Issues and pull requests welcome!  
In particular, please share any issues relating to the latest versions of LLM models and specific MCP servers.  
