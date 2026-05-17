import axios from "axios";

export const analyzeThreat = async (description: string, location: string) => {
  try {
    const response = await axios.post("/api/ai/analyze-threat", {
      description,
      location,
    });
    
    if (response.data.status === "success") {
      return response.data.analysis;
    }
    return "AI analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini analysis proxy failed:", error);
    return "Failed to analyze incident (Network Error).";
  }
};
