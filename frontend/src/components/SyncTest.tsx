import { useState } from 'react';
import { api } from '../api';

export function SyncTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [merchant_id, setMerchant_id] = useState('merchant_default');

  const handleSync = async (connector: string) => {
    setLoading(true);
    const response = await api.syncConnector(connector, merchant_id);
    setResult({ connector, ...response });
    setLoading(false);
  };

  return (
    <div className="test-panel">
      <h3>📦 Sync Data</h3>
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
      <div className="button-group">
        <button onClick={() => handleSync('shopify')} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Shopify'}
        </button>
        <button onClick={() => handleSync('shiprocket')} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Shiprocket'}
        </button>
        <button onClick={() => handleSync('razorpay')} disabled={loading}>
          {loading ? 'Syncing...' : 'Sync Razorpay'}
        </button>
      </div>
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
