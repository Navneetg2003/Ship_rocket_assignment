import { Router, Request, Response } from 'express';
import { runChat } from '../chat/loop';

const router = Router();

interface ChatRequest {
  merchant_id: string;
  message: string;
  history?: Array<{ role: string; content: string }>;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { merchant_id, message, history } = req.body as ChatRequest;

    if (!merchant_id) {
      return res.status(400).json({ error: 'merchant_id is required' });
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Prepare messages
    const messages = history || [];
    messages.push({ role: 'user', content: message });

    // Run chat
    const result = await runChat(merchant_id, messages as any);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
