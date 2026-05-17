import { Router, Request, Response } from 'express';
import { runRTOAgent } from '../agent/rto-agent';
import { getAgentRuns } from '../db/queries';
import { logger } from '../utils/logger';

const router = Router();

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { merchant_id } = req.body;

    logger.info('🤖 Agent run request received', { merchant_id });

    if (!merchant_id) {
      logger.warn('Missing merchant_id in agent run request');
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    logger.debug('Starting RTO agent for merchant', { merchant_id });
    const run = await runRTOAgent(merchant_id);
    
    const totalSavings = run.decisions.reduce((sum, d) => sum + (d.estimated_saving || 0), 0);
    logger.success('RTO agent run completed', {
      merchant_id,
      decisionsCount: run.decisions.length,
      totalSavings,
      runAt: run.run_at
    });
    
    res.json(run);
  } catch (error) {
    const errorMsg = (error as Error).message;
    logger.error('Agent run error', { 
      merchant_id: req.body.merchant_id,
      error: errorMsg,
      stack: (error as Error).stack 
    });
    res.status(500).json({ 
      error: errorMsg,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

router.get('/runs/:merchant_id', (req: Request, res: Response) => {
  try {
    const merchant_id = Array.isArray(req.params.merchant_id)
      ? req.params.merchant_id[0]
      : req.params.merchant_id;
    
    logger.info('📋 Agent runs query received', { merchant_id });
    const runs = getAgentRuns(merchant_id);
    
    logger.success(`Retrieved ${runs.length} agent runs`, { merchant_id });
    res.json(runs);
  } catch (error) {
    const errorMsg = (error as Error).message;
    logger.error('Agent runs query error', { 
      merchant_id: req.params.merchant_id,
      error: errorMsg 
    });
    res.status(500).json({ 
      error: errorMsg,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

export default router;
