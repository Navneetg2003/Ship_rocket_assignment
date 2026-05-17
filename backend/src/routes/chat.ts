import { Router, Request, Response } from 'express';
import { runChat } from '../chat/loop';
import { logger } from '../utils/logger';

const router = Router();

interface ChatRequest {
  merchant_id: string;
  message: string;
  history?: Array<{ role: string; content: string }>;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('📨 Chat request received', { body: req.body });
    const { merchant_id, message, history } = req.body as ChatRequest;

    if (!merchant_id) {
      logger.warn('Missing merchant_id in request');
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    if (!message) {
      logger.warn('Missing message in request');
      return res.status(400).json({ error: 'message is required' });
    }

    logger.info(`Processing chat for merchant: ${merchant_id}`, { message, historyLength: history?.length || 0 });

    // Prepare messages
    const messages = history || [];
    messages.push({ role: 'user', content: message });

    // Run chat
    logger.debug('Running chat loop...');
    const result = await runChat(merchant_id, messages as any);

    logger.success('Chat completed successfully', { turns: result.turns, citationCount: result.citations.length });
    res.json(result);
  } catch (error) {
    logger.error('Chat endpoint error', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      body: req.body,
    });
    res.status(500).json({ 
      error: (error as Error).message,
      details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
});

export default router;
