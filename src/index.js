import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";

import { Ai } from '@cloudflare/ai';


const app = new Hono();

app.get("/", serveStatic({ root: "./index.html" }));
app.get("/css/*", serveStatic({ root: "./css/" }));

app.get("/hono", (c) => {
  return c.text("Hello Hono!");
});

app.post("/prompt", async (c) => {
  const ai = new Ai(c.env.AI);
  const body = await c.req.json();
  // Arrange system message, previous messages, and the new user message
  const messages = [
    { role: "system", content: body.systemMessage },
    ...body.messages,
    { role: "user", content: body.userMessage },
  ];
  console.log(`Sending messages: ${JSON.stringify(messages)} to ${body.model}....`);
  const stream = await ai.run(body.model, { messages, stream: true });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;
