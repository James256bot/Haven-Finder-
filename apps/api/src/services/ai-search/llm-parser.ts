import { ParsedQuerySchema, type ParsedQuery } from './schema';

const LLM_ENDPOINT = process.env.LLM_ENDPOINT ?? 'https://api.openai.com/v1/chat/completions';
const LLM_KEY = process.env.OPENAI_API_KEY ?? '';
const LLM_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are a property search parser for HavenFinder (Kampala, Uganda).
Return ONLY JSON matching this schema. Never invent data. Omit fields not present in the query.

Schema fields (all optional except q):
{
  "q": "leftover keywords",
  "propertyType": "apartment|house|villa|condo|studio|room|hostel|guest_house|office|shop|warehouse|restaurant_space|commercial_building|land|farm|event_venue|hotel|lodge",
  "listingType": "rent|sale|short_stay|commercial_lease|land_sale",
  "bedrooms": number,
  "bathrooms": number,
  "minPrice": number,
  "maxPrice": number,
  "currency": "UGX|KES|NGN|USD|EUR|ZAR",
  "city": string,
  "country": "UG|KE|NG|ZA|GR|PT|IT|MX|JP|FR|GB|AE",
  "neighborhood": string,
  "furnished": boolean,
  "verified": boolean,
  "parking": boolean,
  "pool": boolean,
  "gym": boolean,
  "aircon": boolean,
  "garden": boolean,
  "security": boolean,
  "petFriendly": boolean,
  "serviced": boolean,
  "nearUniversity": "makerere|kyambogo|mubs|ucu|nku|must|kyu|isu",
  "maxCommuteMinutes": number,
  "commuteTo": string
}

Guidance:
- "safe" or "secure" → security: true
- "two students" or "for students" → propertyType: "hostel" (if no other type given)
- "affordable" → do NOT set maxPrice (it's subjective); set q: "affordable"
- "1.5M UGX" → maxPrice: 1500000, currency: "UGX"
- "near Makerere" → nearUniversity: "makerere", neighborhood: "makerere", country: "UG"
- "within 20 minutes of city" → maxCommuteMinutes: 20, commuteTo: "kampala"
- Never guess. Omit unknown fields.`;

export async function parseQueryLLM(input: string): Promise<ParsedQuery | null> {
  if (!LLM_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input.slice(0, 500) },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return ParsedQuerySchema.parse({
      ...parsed,
      parser: 'llm',
      confidence: 0.75,
      language: 'en',
    });
  } catch {
    clearTimeout(timeout);
    return null;
  }
}
