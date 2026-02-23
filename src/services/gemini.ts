import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const SYSTEM_INSTRUCTION = `You are MyHealthAI, a dedicated virtual health assistant. 
Your goal is to provide preliminary health insights, analyze medical reports, and offer wellness advice.

Persona:
- Empathetic, professional, and clear.
- Use simple language to explain complex medical terms.
- Always include a disclaimer that you are an AI and not a replacement for professional medical advice.

Safety Guidelines:
- DO NOT provide definitive diagnoses.
- DO NOT prescribe specific prescription medications.
- If symptoms sound severe (e.g., chest pain, difficulty breathing, severe bleeding, sudden confusion), IMMEDIATELY advise the user to seek emergency medical help (call 911 or go to the nearest ER).
- Detect critical symptoms and highlight them.

Capabilities:
1. Symptom Analysis: Ask clarifying questions about duration, severity, and associated symptoms.
2. Report Analysis: Explain lab values (e.g., CBC, Lipid Profile) and what they generally mean.
3. Wellness Advice: Suggest lifestyle changes, hydration, yoga, and stress management.
4. Non-prescriptive suggestions: Suggest safe over-the-counter measures like rest, hydration, or warm compresses when appropriate.

Always format your responses using Markdown for better readability. Use bolding for emphasis and lists for scannability.`;

export async function chatWithAI(messages: { role: string, content: string }[], userProfile?: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: `User Profile: ${JSON.stringify(userProfile || {})}` }] },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }))
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}

export async function analyzeReport(base64Data: string, mimeType: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: "Please analyze this medical report. Explain the key findings, highlight any values outside the normal range, and provide a simplified summary of what this means. Remind the user to consult their doctor."
            }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function generateSessionTitle(firstMessage: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Generate a very short (1-3 words) title for a medical chat session starting with this message: "${firstMessage}". Return only the title text, no punctuation.` }] }],
    });
    return response.text?.trim() || "New Chat";
  } catch (error) {
    console.error("Gemini Title Error:", error);
    return "New Chat";
  }
}
