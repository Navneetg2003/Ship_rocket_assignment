import { Router, Request, Response } from 'express';
import { getConnector } from '../connectors';

const router = Router();

router.post('/:connector', async (req: Request, res: Response) => {
  try {
    const { connector } = req.params;
    const { merchant_id } = req.body;

    if (!merchant_id) {
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    const connectorInstance = getConnector(connector as any);
    if (!connectorInstance) {
      return res.status(404).json({ error: `Connector '${connector}' not found` });
    }

    const result = await connectorInstance.sync({ merchant_id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
