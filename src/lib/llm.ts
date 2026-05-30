// Optional LLM-vision enrichment. The on-device CV engine is always the
// source of truth for PASS/FAIL; this only adds a natural-language description
// of what the inspector is looking at. If ANTHROPIC_API_KEY is absent or the
// call fails, we return null and the UI falls back to the CV engine's notes.

interface CvSummary {
  deltaE: number;
  uniformity: number;
  defectCount: number;
  foreignMatter: boolean;
  autoResult: string;
}

export async function describeSample(
  imageDataUrl: string,
  materialName: string,
  category: string,
  cv: CvSummary
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(imageDataUrl);
  if (!match) return null;
  const [, mediaType, base64] = match;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              {
                type: "text",
                text:
                  `You are a QC inspector for a natural-extracts manufacturer. This is an incoming ` +
                  `sample of "${materialName}" (category: ${category}). An automated colour-vision ` +
                  `system measured ΔE2000=${cv.deltaE}, uniformity=${cv.uniformity}%, ` +
                  `${cv.defectCount} defect regions, foreign matter=${cv.foreignMatter}, verdict=${cv.autoResult}. ` +
                  `In 2 short sentences, describe the visual appearance (colour, texture, any visible ` +
                  `defects or contamination) to support this verdict. Be concrete and factual.`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === "text")?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
