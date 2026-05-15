import { useState } from 'react';
import { api } from '../api';
import '../styles/TestPanel.css';

export function HealthTest() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    const response = await api.health();
    setResult(response);
    setLoading(false);
  };

  return (
    <div className="test-panel">
      <h3>🏥 Health Check</h3>
      <button onClick={handleTest} disabled={loading}>
        {loading ? 'Testing...' : 'Test Health Endpoint'}
      </button>
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
