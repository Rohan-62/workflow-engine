import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import WorkflowList from './components/WorkflowList';
import WorkflowEditor from './components/WorkflowEditor';
import ExecutionForm from './components/ExecutionForm';
import ExecutionView from './components/ExecutionView';
import AuditLog from './components/AuditLog';
import './index.css';

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="hero-section">
        <h1>⚡ LogicFlow</h1>
        <p>Design, execute, and track powerful automation workflows</p>
      </div>
      <div className="dashboard-cards">
        <a href="/workflows" className="dashboard-card">
          <span className="card-icon">🔄</span>
          <h3>Workflows</h3>
          <p>Create and manage automation workflows with steps and rules</p>
        </a>
        <a href="/audit" className="dashboard-card">
          <span className="card-icon">📋</span>
          <h3>Audit Log</h3>
          <p>Track all workflow executions and review detailed logs</p>
        </a>
        <a href="/workflows/new" className="dashboard-card">
          <span className="card-icon">➕</span>
          <h3>Create New</h3>
          <p>Design a new workflow from scratch</p>
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <div className="container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workflows" element={<WorkflowList />} />
              <Route path="/workflows/new" element={<WorkflowEditor />} />
              <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
              <Route path="/workflows/:id/execute" element={<ExecutionForm />} />
              <Route path="/executions/:id" element={<ExecutionView />} />
              <Route path="/audit" element={<AuditLog />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
