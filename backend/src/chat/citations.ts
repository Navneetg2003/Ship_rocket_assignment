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

/**
 * Validates that every number in the text is properly cited
 * Checks by POSITION, not by value (fixes: same number appearing twice means both must be cited)
 */
export function validateCitations(response: string): string {
  const lines = response.split('\n');
  const validatedLines = [];

  for (const line of lines) {
    // Find all cited regions: [source:...]....[/source]
    const citedRanges: Array<[number, number]> = [];
    let match;
    const citationRegex = /\[source:[^\]]+\][^\[]*\[\/source\]/g;
    while ((match = citationRegex.exec(line)) !== null) {
      citedRanges.push([match.index, match.index + match[0].length]);
    }

    // Check if a position is inside a cited range
    const isPositionCited = (pos: number): boolean => {
      return citedRanges.some(([start, end]) => pos >= start && pos < end);
    };

    // Find all numbers and check if cited
    let validatedLine = line;
    let offset = 0;
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    const numbersToRemove: Array<[number, number]> = [];

    while ((match = numberRegex.exec(line)) !== null) {
      const numberStart = match.index;
      const numberEnd = match.index + match[0].length;

      // Check if this specific number occurrence is cited
      if (!isPositionCited(numberStart)) {
        // This number is uncited, mark for removal
        numbersToRemove.push([numberStart, numberEnd]);
      }
    }

    // Remove uncited numbers in reverse order to maintain indices
    for (let i = numbersToRemove.length - 1; i >= 0; i--) {
      const [start, end] = numbersToRemove[i];
      validatedLine = validatedLine.slice(0, start) + '[UNCITED]' + validatedLine.slice(end);
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
