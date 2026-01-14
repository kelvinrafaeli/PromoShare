
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const optimizePromotionContent = async (title: string, price: number, link: string, coupon?: string) => {
  try {
    const prompt = `
      Crie uma mensagem persuasiva para Telegram/WhatsApp de uma promoção.
      Título: ${title}
      Preço: R$ ${price.toFixed(2)}
      Link: ${link}
      Cupom: ${coupon || 'Nenhum'}
      
      Regras:
      - Use emojis relevantes.
      - Destaque o preço.
      - Inclua uma chamada para ação (CTA) curta.
      - Formato: Markdown (negrito para preço e título).
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
