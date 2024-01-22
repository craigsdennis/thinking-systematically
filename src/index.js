import { Ai } from '@cloudflare/ai';
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { serveStatic } from "hono/cloudflare-workers";

import {EventSourceParserStream} from 'eventsource-parser/stream'



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
  const eventSourceStream = await ai.run(body.model, { messages, stream: true });
  // Since I am not sending back an EventSource stream, I'll just stream back text
  const tokenStream = eventSourceStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  return streamText(c, async (stream) => {
    for await(const msg of tokenStream) {
        const data = JSON.parse(msg.data);
        stream.write(data.response);
    }
  });
});

export default app;
