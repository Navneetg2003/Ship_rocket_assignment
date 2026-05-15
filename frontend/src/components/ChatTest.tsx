import { useState } from 'react';
import { api } from '../api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatTest() {
  const [merchant_id, setMerchant_id] = useState('merchant_default');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    const response = await api.chat(merchant_id, message, messages);

    if (response.success && response.data?.response) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.response },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${response.error}` },
      ]);
    }

    setMessage('');
    setLoading(false);
  };

  return (
    <div className="test-panel">
      <h3>💬 Chat with Claude</h3>
      <div className="input-group">
        <label>
          Merchant ID:
          <input
            type="text"
            value={merchant_id}
            onChange={(e) => setMerchant_id(e.target.value)}
          />
        </label>
      </div>
      <div className="chat-area">
        <div className="messages">
          {messages.length === 0 ? (
            <p className="placeholder">No messages yet. Ask a question!</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
                <p>{msg.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="input-group">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about orders, shipments, payments..."
            disabled={loading}
          />
          <button onClick={handleSend} disabled={loading || !message.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
