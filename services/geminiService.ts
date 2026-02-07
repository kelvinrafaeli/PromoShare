
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const optimizePromotionContent = async (description: string) => {
  try {
    const prompt = `
      Ajuste a descrição de uma promoção para Telegram/WhatsApp, mantendo o conteúdo.
      Descrição original:
      ${description}
      
      Regras:
      - Use emojis relevantes.
      - Inclua uma chamada para ação (CTA) curta.
      - Formato: Markdown (negrito para trechos importantes).
      - Responda APENAS com o conteúdo da mensagem formatada.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Erro ao gerar conteúdo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao processar com IA.";
  }
};
