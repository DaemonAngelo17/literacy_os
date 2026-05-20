import { useState } from 'react';
import { useAILogger } from '../contexts/AILoggerContext';

const MAX_RETRIES = 2;
const BASE_DELAY = 1000;

export function useGeminiQuery() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { errorMemory, addErrorLog } = useAILogger();

  const cleanJSON = (rawText) => {
    let text = rawText.trim();
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return text.trim();
  };

  const fetchWithRetry = async (url, options, retries = 0) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(`Client error: ${response.status}`);
      }
      return response;
    } catch (err) {
      if (retries < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retries);
        console.warn(`Fetch failed. Retrying in ${delay}ms... (${retries + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries + 1);
      }
      throw err;
    }
  };

  const executeQuery = async (apiKey, promptPrefix, material, isErrorLogger = false, targetedSkills = null) => {
    setIsLoading(true);
    setError(null);
    try {
      let skillInstruction = targetedSkills && targetedSkills.length > 0
        ? `\n\nThe teacher has specifically targeted the following ELA skills for this material: ${JSON.stringify(targetedSkills)}. You MUST align your generated content, questions, activities, and rubrics strictly to these targeted skills and micro-skills.`
        : "";

      const systemInstruction = "You are Reading to Writing AI. " + 
        (errorMemory.length > 0 && !isErrorLogger ? `Student's Recent Errors context: ${JSON.stringify(errorMemory)}` : "") + skillInstruction;
      
      const payload = {
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\n${promptPrefix}\n\n${material}` }] }
        ]
      };

      const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) throw new Error("Invalid response structure from Gemini API");

      const cleaned = cleanJSON(textResponse);
      
      if (isErrorLogger) {
        addErrorLog({ toolName: "Error Correction Logger", input: material, aiResponse: cleaned });
      }

      return cleaned;
    } catch (err) {
      setError(err.message || "An unknown error occurred while fetching.");
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { executeQuery, isLoading, error };
}
