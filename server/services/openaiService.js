import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const client = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
};

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleaned);
  }
}

export async function analyzeText(description) {
  const ai = client();

  if (!ai) {
    return {
      available: false,
      error: 'Gemini API key is not configured'
    };
  }

  const prompt = `
You classify public infrastructure complaints for a civic reporting application.

Analyze this citizen complaint:

"${description}"

Return ONLY valid JSON with exactly these fields:

{
  "category": "",
  "problem_summary": "",
  "severity": "Low",
  "possible_department": "",
  "keywords": [],
  "location_context": ""
}

Allowed categories:
- Pothole / Road Damage
- Broken Streetlight
- Garbage Overflow
- Damaged Sidewalk
- Water Leakage
- Damaged Road Sign
- Fallen Tree
- Damaged Public Property
- Drainage Problem
- Other

Allowed severity:
- Low
- Medium
- High
- Critical

Possible departments:
- Roads & Infrastructure
- Electrical / Street Lighting
- Sanitation
- Water Supply
- Parks & Tree Management
- Public Works
- Municipal Administration

Rules:
- Choose the closest matching category.
- Do not invent facts.
- Keep problem_summary concise.
- Return 3-8 useful keywords.
- Return only JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt
    });

    const text = response.text;
    const result = parseJson(text);

    return {
      available: true,
      ...result
    };
  } catch (error) {
    console.error('GEMINI TEXT ERROR:', error.message);

    return {
      available: false,
      error: error.message
    };
  }
}

export async function analyzeImage(filePath) {
  const ai = client();

  if (!ai) {
    return {
      available: false,
      error: 'Gemini API key is not configured'
    };
  }

  try {
    const imageData = fs.readFileSync(filePath).toString('base64');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData
          }
        },
        {
          text: `
Inspect this public infrastructure photograph.

Identify the most likely civic issue.

Return ONLY valid JSON:

{
  "category": "",
  "assessment": "",
  "confidence": "low"
}

Allowed categories:
- Pothole / Road Damage
- Broken Streetlight
- Garbage Overflow
- Damaged Sidewalk
- Water Leakage
- Damaged Road Sign
- Fallen Tree
- Damaged Public Property
- Drainage Problem
- Other

Allowed confidence:
- low
- medium
- high

Do not claim certainty beyond what is visible in the photograph.
`
        }
      ]
    });

    const result = parseJson(response.text);

    return {
      available: true,
      ...result
    };
  } catch (error) {
    console.error('GEMINI IMAGE ERROR:', error.message);

    return {
      available: false,
      error: error.message
    };
  }
}