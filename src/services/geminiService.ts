import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
}

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const analyzeThreat = async (description: string, location: string) => {
  if (!ai) return "AI analysis unavailable.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are a safety expert. Analyze the following reported incident and provide safety tips and a threat assessment level (Low, Medium, High, Critical). Keep it concise.",
      },
      contents: `Incident: ${description}\nLocation: ${location}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to analyze incident.";
  }
};
