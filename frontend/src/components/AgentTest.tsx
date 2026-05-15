import { useState } from 'react';
import { api } from '../api';

export function AgentTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [merchant_id, setMerchant_id] = useState('merchant_default');

  const handleRun = async () => {
    setLoading(true);
    const response = await api.runAgent(merchant_id);
    setResult(response);
    setLoading(false);
  };

  return (
    <div className="test-panel">
      <h3>🤖 RTO Agent</h3>
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
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Run Agent'}
      </button>
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.data && (
            <div>
              <p><strong>Run ID:</strong> {result.data.id}</p>
              <p><strong>Summary:</strong> {result.data.run_summary}</p>
              <p><strong>Total Saving:</strong> ₹{result.data.total_estimated_saving}</p>
              <p><strong>Decisions Count:</strong> {result.data.decisions?.length || 0}</p>
              <details>
                <summary>Full Response</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </div>
          )}
          {result.error && <p className="error">{result.error}</p>}
        </div>
      )}
    </div>
  );
}
