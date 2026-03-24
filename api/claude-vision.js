// api/claude-vision.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, buyers, skus, catList } = req.body;
  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Claude API key not configured" });
  }

  try {
    const buyerRef = buyers.map(b => `${b.id}: ${b.name}`).slice(0, 50).join("\n");
    const skuRef = skus.map(s => s.id).slice(0, 100).join(", ");

    const prompt = `Extract orders from this handwritten slip. Return ONLY JSON:
{
  "orders": [
    {
      "buyer": "buyer_name",
      "confidence": 95,
      "_raw": "raw_text",
      "items": [
        { "sku": "HG 3615", "qty": 5, "confidence": 95 },
        { "sku": null, "_raw": "MF X99", "qty": 3, "confidence": 20 }
      ]
    }
  ]
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-1-20250805",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image.replace(/^data:image\/\w+;base64,/, ""),
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Claude API error:", data);
      return res.status(500).json({ error: data.error?.message || "Claude API error" });
    }

    const content = data.content[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse Claude response" });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return res.status(200).json(extracted);
  } catch (err) {
    console.error("Claude Vision error:", err);
    return res.status(500).json({ error: err.message });
  }
}
