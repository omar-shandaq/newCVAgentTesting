export const config = {
  runtime: "edge",
};

// 16-12-2025 Ghaith's Change Start - streaming Gemini proxy for chat UI only

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "models/gemini-2.5-flash-preview-09-2025";

export default async function handler(req) {
  if (!GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY is not set on the server." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  try {
    const body = await req.json();
    const { prompt, history } = body || {};

    const contents =
      Array.isArray(history) && history.length > 0
        ? history
        : [
            {
              role: "user",
              parts: [{ text: prompt || "" }],
            },
          ];

    const upstreamRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents }),
      }
    );

    if (!upstreamRes.ok || !upstreamRes.body) {
      const errText = await upstreamRes.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error:
            errText ||
            upstreamRes.statusText ||
            "Gemini streaming request failed.",
        }),
        {
          status: upstreamRes.status || 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8");

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamRes.body.getReader();
        let buffer = "";

        // Helper: extract as many complete JSON objects as possible from buffer
        function* extractJsonObjects(str) {
          let start = str.indexOf("{");
          if (start === -1) return;

          let depth = 0;
          let inString = false;
          let escaped = false;

          for (let i = start; i < str.length; i++) {
            const ch = str[i];

            if (inString) {
              if (ch === "\\" && !escaped) {
                escaped = true;
              } else if (ch === '"' && !escaped) {
                inString = false;
              } else {
                escaped = false;
              }
            } else {
              if (ch === '"') {
                inString = true;
              } else if (ch === "{") {
                if (depth === 0) start = i;
                depth++;
              } else if (ch === "}") {
                depth--;
                if (depth === 0) {
                  const jsonStr = str.slice(start, i + 1);
                  yield { jsonStr, endIndex: i + 1 };
                }
              }
            }
          }
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Pull out as many full JSON objects as we can from the buffer
            while (true) {
              const iter = extractJsonObjects(buffer);
              const next = iter.next();
              if (next.done) break;

              const { jsonStr, endIndex } = next.value;
              buffer = buffer.slice(endIndex);

              try {
                const json = JSON.parse(jsonStr);
                const candidates = json.candidates || [];
                for (const cand of candidates) {
                  const parts = cand.content?.parts || [];
                  for (const part of parts) {
                    if (part.text) {
                      controller.enqueue(encoder.encode(part.text));
                    }
                  }
                }
              } catch (e) {
                console.error(
                  "Failed to parse Gemini stream JSON chunk:",
                  e,
                  jsonStr
                );
              }
            }
          }
        } catch (err) {
          console.error("Error while reading Gemini stream:", err);
          controller.error(err);
          return;
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Edge streaming proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error in edge Gemini streaming proxy." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
}
// 16-12-2025 Ghaith's Change End


