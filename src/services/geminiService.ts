import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  async analyzeTaxonomy(taxonomyString: string) {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `请分析以下 eDNA 分类字符串，并用中文简要总结该生物的分类信息：${taxonomyString}`,
    });
    return response.text;
  }
};
