export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { image } = req.body;
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${process.env.VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{ image: { content: image }, features: [{ type: "TEXT_DETECTION" }] }]
      })
    }
  );
  const data = await response.json();
  res.status(200).json(data);
}
