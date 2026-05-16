import Groq from 'groq-sdk';
import { chatTools } from './tools';
import { executeTool } from './executor';
import { CITATION_SYSTEM_PROMPT, validateCitations, formatCitations } from './citations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  response: string;
  citations: string[];
  toolCalls: string[];
  turns: number;
}

export async function runChat(
  merchant_id: string,
  messages: Message[]
): Promise<ChatResponse> {
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
    { role: 'system', content: CITATION_SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  ];

  let turns = 0;
  const maxTurns = 5;
  const toolCallLog: string[] = [];

  while (turns < maxTurns) {
    turns++;

    // Call Llama via Groq
    const response = await client.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      max_tokens: 1024,
      messages: conversationHistory as any,
    });

    // Check if we got a response
    if (!response.choices || response.choices.length === 0) {
      break;
    }

    // Extract text response
    const finalText = response.choices[0].message?.content || '';

    if (!finalText) {
      break;
    }

    // Validate citations
    const validatedText = validateCitations(finalText);
    const formattedText = formatCitations(validatedText);

    return {
      response: formattedText,
      citations: extractCitations(formattedText),
      toolCalls: toolCallLog,
      turns,
    };
  }

  // Max turns reached
  return {
    response: 'Maximum conversation turns reached. Please rephrase your query.',
    citations: [],
    toolCalls: toolCallLog,
    turns,
  };
}

function extractCitations(text: string): string[] {
  const citationPattern = /\[source:([^\]]+)\]/g;
  const citations = new Set<string>();

  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    citations.add(match[1]);
  }

  return Array.from(citations);
}
