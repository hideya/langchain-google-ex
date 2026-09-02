import "dotenv/config";
// import { ChatGoogle } from "@langchain/google/node";
// import { ChatGoogleEx } from "@h1deya/langchain-google-ex";
import { ChatGoogleEx } from "../index.js";
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
