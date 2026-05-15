const API_BASE_URL = 'http://localhost:3000';

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status: number;
}

export async function apiCall(
  method: string,
  endpoint: string,
  body?: any
): Promise<ApiResponse> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => null);

    return {
      success: response.ok,
      data,
      status: response.status,
      error: !response.ok ? `HTTP ${response.status}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      status: 0,
    };
  }
}

export const api = {
  health: () => apiCall('GET', '/health'),
  
  syncConnector: (connector: string, merchant_id: string = 'merchant_default') =>
    apiCall('POST', `/api/sync/${connector}`, { merchant_id }),
  
  runAgent: (merchant_id: string = 'merchant_default') =>
    apiCall('POST', '/api/agent/run', { merchant_id }),
  
  getAgentRuns: (merchant_id: string = 'merchant_default') =>
    apiCall('GET', `/api/agent/runs/${merchant_id}`),
  
  chat: (merchant_id: string, message: string, history: any[] = []) =>
    apiCall('POST', '/api/chat', { merchant_id, message, history }),
};
