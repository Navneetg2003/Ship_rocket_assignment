import { useState } from 'react';
import { api } from '../api';

export function AgentRunsTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [merchant_id, setMerchant_id] = useState('merchant_default');

  const handleFetch = async () => {
    setLoading(true);
    const response = await api.getAgentRuns(merchant_id);
    setResult(response);
    setLoading(false);
  };

  return (
    <div className="test-panel">
      <h3>📋 Agent Run History</h3>
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
      <button onClick={handleFetch} disabled={loading}>
        {loading ? 'Fetching...' : 'Get Run History'}
      </button>
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {Array.isArray(result.data?.value) && (
            <div>
              <p><strong>Total Runs:</strong> {result.data.value.length}</p>
              {result.data.value.length === 0 ? (
                <p>No runs yet</p>
              ) : (
                <ul>
                  {result.data.value.map((run: any, idx: number) => (
                    <li key={idx}>
                      Run #{run.id} - {new Date(run.run_at).toLocaleString()}
                      <br />
                      <small>{run.run_summary}</small>
                    </li>
                  ))}
                </ul>
              )}
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
