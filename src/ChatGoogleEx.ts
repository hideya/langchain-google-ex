import { ChatGoogle, type ChatGoogleParams } from "@langchain/google/node";
import { transformMcpToolsForGemini } from "./schema-adapter-gemini.js";

/**
 * Drop-in replacement for ChatGoogle that automatically transforms MCP tool schemas
 * to be compatible with Gemini's strict schema requirements.
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
