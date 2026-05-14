import { Router, Request, Response } from 'express';
import { runRTOAgent } from '../agent/rto-agent';
import { getAgentRuns } from '../db/queries';

const router = Router();

router.post('/run', async (req: Request, res: Response) => {
  try {
    const { merchant_id } = req.body;

    if (!merchant_id) {
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    const run = await runRTOAgent(merchant_id);
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/runs/:merchant_id', (req: Request, res: Response) => {
  try {
    const { merchant_id } = req.params;
    const runs = getAgentRuns(merchant_id);
    res.json(runs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
