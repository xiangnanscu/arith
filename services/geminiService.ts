
import { GoogleGenAI } from "@google/genai";
import { OpType } from "../types";

const getSystemInstruction = () => `
你是一位专门教5岁小朋友的数学老师，语气要非常亲切、活泼、充满鼓励。
请使用中文回答。
多使用emoji表情。
你的目标是用形象的物体（比如苹果、积木、糖果）来解释数学算式。
回答限制在2句简短的话以内。
`;

export const getExplanation = async (
  num1: number,
  num2: number,
  operation: OpType,
  answer: number
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "请让大人帮忙检查一下 API Key 哦！ 🗝️";
  }

  try {
    // Initialize GoogleGenAI with a named parameter as required.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let prompt = "";
    switch (operation) {
      case OpType.ADD:
        prompt = `解释为什么 ${num1} + ${num2} 等于 ${answer}。如果和大于10，请强调“凑十法”。`;
        break;
      case OpType.SUB:
        prompt = `解释为什么 ${num1} - ${num2} 等于 ${answer}。`;
        break;
      case OpType.MUL:
        prompt = `用分组的概念解释为什么 ${num1} x ${num2} 等于 ${answer}。`;
        break;
      case OpType.DIV:
        prompt = `用分东西的概念解释为什么 ${num1} ÷ ${num2} 等于 ${answer}。`;
        break;
    }

    // Using gemini-3-flash-preview for the basic text generation task as recommended.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
        temperature: 0.7,
      }
    });

    // Accessing the response text via the .text property directly.
    return response.text || "加油！继续数数看！";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "做得很棒！下次我们一起数一数。";
  }
};
