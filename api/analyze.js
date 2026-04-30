export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { jobDescription } = req.body;
  if (!jobDescription) return res.status(400).json({ error: 'No job description provided' });

  const systemPrompt = `You are an expert career advisor and job market analyst. Analyze job descriptions and return ONLY valid JSON with no markdown, no backticks, no preamble.

Return exactly this structure:
{
  "overall_score": <number 1-10, 10 = excellent opportunity>,
  "verdict": "<one sentence summary>",
  "recommendation": "apply" | "caution" | "avoid",
  "salary_assessment": "<honest assessment of salary transparency and fairness>",
  "red_flags": [{"flag": "<short title>", "detail": "<explanation>"}],
  "green_flags": [{"flag": "<short title>", "detail": "<explanation>"}],
  "role_reality": "<what this job actually is vs what it claims to be>",
  "questions_to_ask": ["<question 1>", "<question 2>", "<question 3>"]
}

Be honest and direct. Flag vague salaries, unrealistic requirements, signs of high turnover, MLM patterns, unpaid work disguised as internships, commission-only roles, and other red flags. Also highlight genuine positives like clear salary, growth path, and real benefits.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: jobDescription }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'API error', detail: err });
    }

    const data = await response.json();
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong', detail: error.message });
  }
}
