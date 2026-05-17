import { Router, Request, Response } from 'express';
import { getConnector } from '../connectors';
import { logger } from '../utils/logger';

const router = Router();

router.post('/:connector', async (req: Request, res: Response) => {
  try {
    const { connector } = req.params;
    const { merchant_id } = req.body;

    logger.info('📥 Sync request received', { connector, merchant_id });

    if (!merchant_id) {
      logger.warn('Missing merchant_id in sync request');
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    const connectorInstance = getConnector(connector as any);
    if (!connectorInstance) {
      logger.error(`Connector not found: ${connector}`);
      return res.status(404).json({ error: `Connector '${connector}' not found` });
    }

    logger.debug(`Starting sync for connector: ${connector}`, { merchant_id });
    const result = await connectorInstance.sync({ merchant_id });
    
    logger.success(`Sync completed for ${connector}`, {
      inserted: result.rowsInserted,
      updated: result.rowsUpdated,
      total: result.totalRows,
      error: result.error || 'none'
    });
    
    res.json(result);
  } catch (error) {
    const errorMsg = (error as Error).message;
    logger.error('Sync endpoint error', { 
      connector: req.params.connector,
      error: errorMsg,
      stack: (error as Error).stack 
    });
    res.status(500).json({ 
      error: errorMsg,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

export default router;
