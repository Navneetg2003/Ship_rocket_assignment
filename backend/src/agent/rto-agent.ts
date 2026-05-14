import { getAllNDRShipments, getRelated, getByEntityType } from '../db/queries';
import { saveAgentRun } from '../db/queries';
import { AgentDecision, AgentRunLog } from '../types';

/**
 * RTO Agent: Reduces To-be-Returned Overheads
 * Makes decisions on what to do with shipments that have Not Delivered Right (NDR) status
 *
 * Decision Rules:
 * - ndr_count >= 3 → CANCEL (too many failed attempts)
 * - ndr_count >= 2 AND reason = refused → CANCEL (customer explicitly refused)
 * - ndr_count >= 2 AND cod < ₹500 → CANCEL (low-value COD not worth retry)
 * - ndr_count == 1 AND cod >= ₹1500 → RETRY (high-value, worth one more try)
 * - else → HOLD (pending manual review)
 */

interface ShipmentWithOrder {
  shipment: any;
  order: any;
}

export async function runRTOAgent(merchant_id: string): Promise<AgentRunLog> {
  const ndrShipments = getAllNDRShipments(merchant_id);

  const decisions: AgentDecision[] = [];
  let totalSavings = 0;

  for (const shipment of ndrShipments) {
    const related = getRelated(shipment.entity_id, merchant_id);
    const linkedOrder = related.find(r => r.entity_type === 'order');

    const ndrCount = shipment.ndr_count || 0;
    const ndrReason = shipment.raw?.ndr_reason || 'unknown';
    const codAmount = linkedOrder?.amount || 0;

    let action: 'CANCEL' | 'RETRY' | 'HOLD';
    let estimatedSaving = 0;
    let reasoning = '';

    // Apply decision rules
    if (ndrCount >= 3) {
      action = 'CANCEL';
      estimatedSaving = codAmount * 0.15; // 15% of order value saved (no more retries)
      reasoning = `NDR count ${ndrCount} ≥ 3, cancel to stop costly retries`;
    } else if (ndrCount >= 2 && ndrReason === 'refused') {
      action = 'CANCEL';
      estimatedSaving = codAmount * 0.10; // 10% saving
      reasoning = `${ndrCount} NDRs + customer refused, cancel`;
    } else if (ndrCount >= 2 && codAmount < 500) {
      action = 'CANCEL';
      estimatedSaving = codAmount * 0.08; // 8% saving
      reasoning = `${ndrCount} NDRs + low value (₹${codAmount}), not worth retry`;
    } else if (ndrCount === 1 && codAmount >= 1500) {
      action = 'RETRY';
      estimatedSaving = 0; // Retry might succeed, no saving yet
      reasoning = `Single NDR + high value (₹${codAmount}), worth one more try`;
    } else {
      action = 'HOLD';
      estimatedSaving = 0;
      reasoning = `NDR count ${ndrCount}, reason ${ndrReason}, pending manual review`;
    }

    decisions.push({
      shipment_id: shipment.entity_id,
      order_id: linkedOrder?.entity_id || 'unknown',
      action,
      reason: reasoning,
      estimated_saving: estimatedSaving,
      ndr_count: ndrCount,
    });

    totalSavings += estimatedSaving;
  }

  // Build run summary
  const cancelCount = decisions.filter(d => d.action === 'CANCEL').length;
  const retryCount = decisions.filter(d => d.action === 'RETRY').length;
  const holdCount = decisions.filter(d => d.action === 'HOLD').length;

  const runSummary = `RTO Run: ${decisions.length} NDR shipments analyzed. 
${cancelCount} to cancel (est. saving ₹${totalSavings.toFixed(2)}), 
${retryCount} to retry, ${holdCount} to hold for review.`;

  const run: AgentRunLog = {
    merchant_id,
    run_at: new Date().toISOString(),
    decisions,
    total_estimated_saving: totalSavings,
    run_summary: runSummary,
  };

  // Save to DB
  run.id = saveAgentRun(run);

  return run;
}
