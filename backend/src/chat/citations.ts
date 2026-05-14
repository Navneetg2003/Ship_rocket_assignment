/**
 * Citation system: enforces that every number in the response has a source citation
 * Format: [source:entity_id]value[/source]
 */

const CITATION_PATTERN = /\[source:[^\]]+\][^\[]*\[\/source\]/g;
const NUMBER_PATTERN = /\b(\d+(?:\.\d+)?)\b/g;

/**
 * System prompt that enforces citations
 */
export const CITATION_SYSTEM_PROMPT = `You are a helpful e-commerce analytics assistant.

CRITICAL: Every single number you mention must be cited with [source:entity_id]number[/source] format.
For example:
- ✅ "There are [source:order_count]42[/source] orders"
- ✅ "Revenue is [source:revenue]₹1,500[/source]"
- ❌ "There are 42 orders" (NOT CITED)
- ❌ "Revenue is ₹1,500" (NOT CITED)

Do not make claims without citations. If you don't have the exact number, say "I don't have this data" instead of guessing.
Strip any uncited numbers before providing your response.`;

export function validateCitations(response: string): string {
  // Find all numbers without citations
  const lines = response.split('\n');
  const validatedLines = [];

  for (const line of lines) {
    // Check for uncited numbers
    const citedCounts: Record<string, number> = {};

    // Count cited numbers
    const matches = line.matchAll(CITATION_PATTERN);
    for (const match of matches) {
      // Extract numbers from cited sections
      const cited = match[0];
      const numbers = cited.matchAll(NUMBER_PATTERN);
      for (const num of numbers) {
        citedCounts[num[1]] = (citedCounts[num[1]] || 0) + 1;
      }
    }

    // Find uncited numbers
    const uncitedNumbers = new Set<string>();
    const numberMatches = line.matchAll(NUMBER_PATTERN);
    for (const match of numberMatches) {
      const num = match[1];
      if (!citedCounts[num] || citedCounts[num] === 0) {
        uncitedNumbers.add(num);
      }
    }

    // Strip uncited numbers if any
    let validatedLine = line;
    if (uncitedNumbers.size > 0) {
      for (const uncitedNum of uncitedNumbers) {
        // Only remove if not part of a cited section
        const regex = new RegExp(`(?<!\\[source:[^\\]]*?)\\b${uncitedNum}\\b(?![^\\[]*\\[\/source\\])`, 'g');
        validatedLine = validatedLine.replace(regex, '[UNCITED]');
      }
    }

    validatedLines.push(validatedLine);
  }

  return validatedLines.join('\n');
}

export function stripUncited(text: string): string {
  // Remove [UNCITED] markers and any text that was stripped
  return text.replace(/\[UNCITED\]/g, '').trim();
}

export function formatCitations(text: string): string {
  // Convert citations to footnote format
  // [source:entity_id]text[/source] -> text [source:entity_id]
  return text.replace(/\[source:([^\]]+)\]([^\[]+)\[\/source\]/g, '$2 [source:$1]');
}
