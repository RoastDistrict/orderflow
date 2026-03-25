// api/claude-vision.js
// Production-grade Claude Vision extraction for multi-order slips
// Handles: multi-column layouts, Hindi/English names, quantity abbreviations, visual boundaries

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
    // ─── Build master data references ─────────────────────────────
    const buyerRef = buyers
      .slice(0, 100)
      .map((b) => `${b.id}: ${b.name}${b.aliases && b.aliases.length > 0 ? ` (${b.aliases.join(", ")})` : ""}`)
      .join("\n");

    const skuRef = skus.slice(0, 150).map((s) => `${s.id}`).join(", ");

    // ─── System prompt for multi-order extraction ─────────────────
    const systemPrompt = `You are an expert at extracting orders from handwritten laminate shop slips. These slips often have:
- Multiple buyers (columns, rows, or grouped sections)
- Abbreviated buyer names mixed with Hindi and English
- SKU codes followed by quantities (with - or = or space)
- Visual separators (lines, spacing) between orders
- Messy handwriting, ticks, checkmarks, arrows

CRITICAL RULES:
1. **Separate by buyer**: One order = one buyer. Group all items for the same buyer together.
2. **Column layouts**: Slips often have 5-10 vertical columns. Each column = ONE buyer.
3. **Visual boundaries**: Use lines, spacing, and layout to identify separate buyers.
4. **Quantity markers**: "SKU-5" or "SKU = 5" or "SKU 5" all mean qty=5. Skip ticks/checkmarks.
5. **Master list matching**: Try hard to match abbreviated names to the master buyer list.
6. **Hindi names**: OK to include Hindi text. Keep it as-is if no English match found.
7. **Low confidence**: If unsure about a buyer name, return raw text + low confidence (20-60).
8. **Notes extraction**: Capture phone, address, delivery location, contact person, instructions as notes text.

MASTER BUYER LIST (use for fuzzy matching):
${buyerRef}

MASTER SKU LIST (match exactly where possible):
${skuRef}

OUTPUT FORMAT (strict JSON, no preamble):
{
  "orders": [
    {
      "buyer": "Exact buyer name from master list or abbreviated raw text",
      "confidence": 85,
      "_raw": "Raw OCR text for buyer name (if not exact match)",
      "notes": "Phone: 9876543210, Sector 5, Attn: Rajesh",
      "items": [
        { "sku": "HG 3615", "qty": 5, "confidence": 95 },
        { "sku": null, "_raw": "MF X99", "qty": 3, "confidence": 20 }
      ]
    }
  ]
}

CONFIDENCE SCORING:
- Buyer name: 0-100 (95+ = master list exact match, 70-94 = fuzzy match, <70 = abbreviation/Hindi)
- SKU: 0-100 (95+ = exact match, 70-94 = close match, <70 = unrecognized, use _raw)

For each SKU found:
- If it matches master list exactly → confidence 95+
- If it's close but not exact → confidence 70-94
- If unrecognized → confidence 0, include _raw field with original text`;

    const userPrompt = `Extract ALL orders from this slip. For each distinct buyer/column:
1. Identify buyer name (look for headers, customer names at top/side of column)
2. Extract all SKU-qty pairs below that buyer
3. Capture ANY other text as notes: phone number, address, delivery location, contact person, special instructions, date, etc.
4. Return confidence for both buyer and each SKU

NOTES EXTRACTION:
- Phone numbers: "98765-43210", "9876543210", "Ph:", "Mobile:" → include in notes
- Addresses: "123 Main St", "Sector 5", "Near Park" → include in notes
- Contact: "Attn: Rajesh", "Contact: Priya" → include in notes
- Dates: "15/3", "tomorrow", "urgent" → include in notes
- Instructions: "Fragile", "Rush", "COD" → include in notes
- Exclude: buyer names, SKU codes, quantities

If this is a multi-column slip (common for these shops), treat each column as a separate order.
If you see the same buyer twice, combine their items into ONE order.

Return ONLY valid JSON, no markdown formatting.`;

    // ─── Call Claude Vision API ───────────────────────────────────
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-1-20250805",
        max_tokens: 4000,
        system: systemPrompt,
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
                text: userPrompt,
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

    // ─── Parse Claude response ────────────────────────────────────
    const content = data.content[0]?.text || "";
    
    // Extract JSON block (Claude sometimes adds markdown formatting)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response:", content.substring(0, 200));
      return res.status(500).json({ error: "Could not parse Claude response" });
    }

    let extracted = JSON.parse(jsonMatch[0]);

    // ─── Post-process: fuzzy match buyer names ───────────────────
    if (extracted.orders && Array.isArray(extracted.orders)) {
      extracted.orders = extracted.orders.map((order) => {
        const matched = fuzzyMatchBuyer(order.buyer, buyers);
        return {
          buyer: matched.name || order.buyer,
          confidence: matched.confidence || order.confidence || 60,
          _raw: order._raw || (matched.name ? null : order.buyer),
          notes: (order.notes || "").trim() || null,
          items: (order.items || []).map((item) => ({
            sku: item.sku || null,
            qty: item.qty || 1,
            confidence: item.confidence || 0,
            _raw: item._raw || null,
          })),
        };
      });
    }

    return res.status(200).json(extracted);
  } catch (err) {
    console.error("Claude Vision error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Fuzzy buyer name matching ─────────────────────────────────────
function fuzzyMatchBuyer(rawName, buyerList) {
  if (!rawName || buyerList.length === 0) {
    return { name: null, confidence: 0 };
  }

  const clean = rawName.toUpperCase().trim();

  // Rule 1: Exact match
  for (const buyer of buyerList) {
    if (buyer.name.toUpperCase() === clean) {
      return { name: buyer.name, confidence: 100 };
    }
  }

  // Rule 2: Starts with (e.g., "Devangi K" → "Devangi Kitchen")
  for (const buyer of buyerList) {
    const buyerUpper = buyer.name.toUpperCase();
    if (buyerUpper.startsWith(clean) || clean.startsWith(buyerUpper.substring(0, clean.length))) {
      return { name: buyer.name, confidence: 85 };
    }
  }

  // Rule 3: Substring match (e.g., "Mahavir" in "Mahavir Traders")
  for (const buyer of buyerList) {
    if (buyer.name.toUpperCase().includes(clean)) {
      return { name: buyer.name, confidence: 80 };
    }
  }

  // Rule 4: Levenshtein distance (typos/OCR errors)
  let bestMatch = null,
    bestScore = 0;
  for (const buyer of buyerList) {
    const score = levenshteinSimilarity(clean, buyer.name.toUpperCase());
    if (score > bestScore && score > 0.75) {
      bestScore = score;
      bestMatch = buyer.name;
    }
  }
  if (bestMatch) {
    return { name: bestMatch, confidence: Math.round(bestScore * 100) };
  }

  // Rule 5: Check aliases
  for (const buyer of buyerList) {
    if (buyer.aliases && buyer.aliases.length > 0) {
      for (const alias of buyer.aliases) {
        if (alias.toUpperCase() === clean) {
          return { name: buyer.name, confidence: 90 };
        }
      }
    }
  }

  // No match
  return { name: null, confidence: 0 };
}

// ─── Levenshtein distance (normalized to 0-1) ───────────────────────
function levenshteinSimilarity(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const maxLen = Math.max(m, n);
  return 1 - dp[m][n] / maxLen;
}
