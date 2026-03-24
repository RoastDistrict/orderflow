// api/claude-vision.js
// Vercel serverless function: extracts orders from handwritten slips using Claude Vision
// POST /api/claude-vision with { image, buyers, skus, catList }

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
    // Build reference data for Claude's context
    const buyerRef = buyers.map(b => `${b.id}: ${b.name} (${b.group})`).slice(0, 50).join("\n");
    const skuRef = skus.map(s => `${s.id} (${catList.find(c => c.id === s.cat)?.name || "unknown"})`).slice(0, 100).join("\n");

    const prompt = `You are an order extraction assistant for a laminate shop. 
Extract all orders from this handwritten slip image.

BUYERS (sample):
${buyerRef}

SKUS (sample):
${skuRef}

TASK:
1. Identify each buyer/customer (section name)
2. Extract SKU codes and quantities for each buyer
3. Return JSON with confidence scores for each match

Return ONLY valid JSON (no markdown, no preamble):
{
  "orders": [
    {
      "buyer": "exact_buyer_name_or_new_name",
      "confidence": 95,
      "_raw": "raw_ocr_text_from_slip",
      "items": [
        { "sku": "HG 3615", "qty": 5, "confidence": 95 },
        { "sku": null, "_raw": "MF X99", "qty": 3, "confidence": 20 }
      ]
    }
  ]
}

CONFIDENCE RULES:
- 95-100: Exact match found in master list
- 70-94: Close match (minor OCR error)
- 1-69: Partial match, needs user confirmation
- 0: No match, user must type correct value

For each unmatched buyer/SKU, include _raw field with what you actually read from the image.`;

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
      return res.status(500).json({ error: `Claude API error: ${data.error?.message || "Unknown"}` });
    }

    // Extract JSON from response
    const content = data.content[0]?.text || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: "Could not parse Claude response as JSON" });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return res.status(200).json(extracted);
  } catch (err) {
    console.error("Claude Vision error:", err);
    return res.status(500).json({ error: err.message });
  }
}
