import { ChatGoogle, type ChatGoogleParams } from "@langchain/google/node";
import { transformMcpToolsForGemini } from "./schema-adapter-gemini.js";

/**
 * Drop-in replacement for `ChatGoogle` that automatically adapts MCP tool
 * schemas for Gemini function calling.
 *
 * Use this class anywhere you would normally use `ChatGoogle` from
 * `@langchain/google/node`:
 *
 * ```ts
 * import { ChatGoogleEx } from "@h1deya/langchain-google-ex";
 *
 * const model = new ChatGoogleEx({
 *   model: "gemini-2.5-flash",
 *   apiKey: process.env.GOOGLE_API_KEY,
 * });
 * ```
 *
 * The public API intentionally stays small. Pass the original MCP tools to your
 * LangChain agent; `ChatGoogleEx` transforms their schemas when LangChain binds
 * tools to the model.
 */
export class ChatGoogleEx extends ChatGoogle {
  private static transformCache = new Map<string, any[]>();

  // Avoid Node's crypto module so the class can stay close to LangChain's runtime shape.
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  constructor(model: string, params?: Omit<ChatGoogleParams, "model">);
  constructor(params: ChatGoogleParams);
  /**
   * Creates a `ChatGoogleEx` model with the same constructor shapes supported by
   * `ChatGoogle`.
   *
   * When using a Google AI Studio / Gemini Developer API key, pass `apiKey`
   * explicitly to avoid falling back to Vertex AI / Google Cloud authentication
   * in environments where `@langchain/google` cannot infer the intended
   * authentication path.
   */
  constructor(
    modelOrParams: string | ChatGoogleParams,
    params?: Omit<ChatGoogleParams, "model">
  ) {
    if (typeof modelOrParams === "string") {
      super(modelOrParams, params);
    } else {
      super(modelOrParams);
    }
  }

  /**
   * Transforms MCP tool schemas for Gemini compatibility, then delegates to
   * `ChatGoogle.bindTools()`.
   *
   * This runs at binding time so LangChain keeps the original tool objects and
   * their invocation behavior, while Gemini receives schemas with unsupported
   * JSON Schema constructs removed or simplified.
   */
  override bindTools(
    tools: any[],
    kwargs?: Parameters<ChatGoogle["bindTools"]>[1]
  ): ReturnType<ChatGoogle["bindTools"]> {
    const verbose = process.env.LANGCHAIN_GOOGLE_EX_VERBOSE === "true";
    const toolsHash = ChatGoogleEx.simpleHash(JSON.stringify(tools));

    let transformedTools = ChatGoogleEx.transformCache.get(toolsHash);

    if (transformedTools) {
      if (verbose) {
        console.log(`✅ Using cached transformation (hash: ${toolsHash})`);
      }
    } else {
      if (verbose) {
        console.log(`🔑 New tools detected (hash: ${toolsHash})`);
      }
      transformedTools = transformMcpToolsForGemini(tools, { verbose });
      ChatGoogleEx.transformCache.set(toolsHash, transformedTools);
    }

    return super.bindTools(transformedTools, kwargs);
  }
}
