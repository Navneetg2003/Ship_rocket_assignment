import { useState } from 'react';
import { HealthTest } from './components/HealthTest';
import { SyncTest } from './components/SyncTest';
import { AgentTest } from './components/AgentTest';
import { AgentRunsTest } from './components/AgentRunsTest';
import { ChatTest } from './components/ChatTest';
import './App.css';
import './styles/TestPanel.css';

function App() {
  const [activeTab, setActiveTab] = useState<'health' | 'sync' | 'agent' | 'runs' | 'chat'>('health');

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Shiprocket Analytics - Frontend Tester</h1>
        <p>Test all API endpoints in one place</p>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          🏥 Health
        </button>
        <button
          className={`tab ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          📦 Sync
        </button>
        <button
          className={`tab ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          🤖 Agent
        </button>
        <button
          className={`tab ${activeTab === 'runs' ? 'active' : ''}`}
          onClick={() => setActiveTab('runs')}
        >
          📋 History
        </button>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
      </nav>

      <main className="container">
        {activeTab === 'health' && <HealthTest />}
        {activeTab === 'sync' && <SyncTest />}
        {activeTab === 'agent' && <AgentTest />}
        {activeTab === 'runs' && <AgentRunsTest />}
        {activeTab === 'chat' && <ChatTest />}
      </main>

      <footer className="app-footer">
        <p>Backend running on <code>http://localhost:3000</code></p>
        <p>Make sure the backend server is running before testing!</p>
      </footer>
    </div>
  );
}

export default App;
