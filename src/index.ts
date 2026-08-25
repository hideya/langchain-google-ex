/**
 * @h1deya/langchain-google-ex
 * 
 * Drop-in replacement for ChatGoogle that automatically fixes
 * schema compatibility issues with MCP tools and Google Gemini.
 * 
 * Simply replace:
 *   import { ChatGoogle } from '@langchain/google/node';
 * With:
 *   import { ChatGoogleEx } from '@h1deya/langchain-google-ex';
 * 
 * All MCP tool schemas are automatically transformed for Gemini compatibility.
 */

// Chat Models - Extended classes with automatic schema transformation
export { ChatGoogleEx } from "./ChatGoogleEx.js";
