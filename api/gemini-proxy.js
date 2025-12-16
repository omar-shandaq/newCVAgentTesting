export const config = {
  runtime: "edge",
};

// 16-12-2025 Ghaith's Change Start - non-streaming JSON Gemini proxy

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
      `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents }),
      }
    );

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return new Response(
        JSON.stringify({
          error:
            errText || upstreamRes.statusText || "Gemini request failed.",
        }),
        {
          status: upstreamRes.status || 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const data = await upstreamRes.json();
    const candidates = data.candidates || [];
    let text = "";

    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    console.error("Non-stream Gemini proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error in Gemini proxy." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
}
// 16-12-2025 Ghaith's Change End