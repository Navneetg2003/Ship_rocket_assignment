import Groq from 'groq-sdk';
import { chatTools } from './tools';
import { executeTool } from './executor';
import { CITATION_SYSTEM_PROMPT, validateCitations, formatCitations } from './citations';
import { logger } from '../utils/logger';

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
  logger.info(`🤖 Starting chat loop for merchant: ${merchant_id}`, { messageCount: messages.length });

  // Check API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.error('GROQ_API_KEY environment variable not set!');
    throw new Error('GROQ_API_KEY is not configured. Please check your .env file.');
  }

  const client = new Groq({
    apiKey,
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
    logger.debug(`Chat turn ${turns}/${maxTurns}`);

    try {
      // Call Llama via Groq
      logger.debug(`Calling Groq API with model: llama-3.2-90b-vision-preview`);
      const response = await client.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        max_tokens: 1024,
        messages: conversationHistory as any,
      });

      logger.debug(`Groq API response received`, { choicesCount: response.choices?.length });

      // Check if we got a response
      if (!response.choices || response.choices.length === 0) {
        logger.warn('No choices in Groq response, breaking loop');
        break;
      }

      // Extract text response
      const finalText = response.choices[0].message?.content || '';

      if (!finalText) {
        logger.warn('No content in response, breaking loop');
        break;
      }

      logger.debug(`Got response from model`, { textLength: finalText.length });

      // Validate citations
      const validatedText = validateCitations(finalText);
      const formattedText = formatCitations(validatedText);

      logger.success(`Chat completed in ${turns} turn(s)`);
      return {
        response: formattedText,
        citations: extractCitations(formattedText),
        toolCalls: toolCallLog,
        turns,
      };
    } catch (turnError) {
      logger.error(`Error in chat turn ${turns}`, turnError);
      throw turnError;
    }
  }

  // Max turns reached
  logger.warn(`Max turns (${maxTurns}) reached`);
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
