import Anthropic from '@anthropic-ai/sdk';
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
  const client = new Anthropic();

  const conversationHistory: Anthropic.Messages.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let turns = 0;
  const maxTurns = 5;
  const toolCallLog: string[] = [];

  while (turns < maxTurns) {
    turns++;

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: CITATION_SYSTEM_PROMPT,
      tools: chatTools as Anthropic.Messages.Tool[],
      messages: conversationHistory,
    });

    // Check if we got a tool use
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      // No tool calls, extract text response
      const textBlocks = response.content.filter(b => b.type === 'text');
      const finalText = textBlocks.map(b => (b as any).text).join('\n');

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

    // Process tool calls
    const toolResults: Anthropic.Messages.MessageParam[] = [];

    for (const toolUse of toolUseBlocks) {
      if (toolUse.type !== 'tool_use') continue;

      const toolName = toolUse.name;
      const toolInput = toolUse.input as any;

      toolCallLog.push(toolName);

      try {
        const result = await executeTool(toolName, toolInput, merchant_id);

        // Add assistant response with tool use
        conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });

        // Add tool result
        conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result, null, 2),
            },
          ],
        });
      } catch (error) {
        conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });

        conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${(error as Error).message}`,
              is_error: true,
            },
          ],
        });
      }
    }
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
