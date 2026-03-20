import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExecution, approveExecution, rejectExecution, cancelExecution, retryExecution } from '../api/api';

function ExecutionView({ executionId: propExecutionId }) {
    const params = useParams();
    const navigate = useNavigate();
    const execId = propExecutionId || params.id;

    const [execution, setExecution] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchExecution();
        // Poll for updates if in_progress
        const interval = setInterval(fetchExecution, 3000);
        return () => clearInterval(interval);
    }, [execId]);

    const fetchExecution = async () => {
        try {
            const res = await getExecution(execId);
            setExecution(res.data.data);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await approveExecution(execId, { approver_id: 'user' });
            await fetchExecution();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(false);
    };

    const handleReject = async () => {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;
        setActionLoading(true);
        try {
            await rejectExecution(execId, { approver_id: 'user', reason });
            await fetchExecution();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(false);
    };

    const handleCancel = async () => {
        if (!window.confirm('Cancel this execution?')) return;
        setActionLoading(true);
        try {
            await cancelExecution(execId);
            await fetchExecution();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(false);
    };

    const handleRetry = async () => {
        setActionLoading(true);
        try {
            await retryExecution(execId);
            await fetchExecution();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'badge-success';
            case 'failed': return 'badge-danger';
            case 'canceled': return 'badge-neutral';
            case 'in_progress': return 'badge-warning';
            case 'pending': return 'badge-info';
            default: return 'badge-neutral';
        }
    };

    const getDuration = (start, end) => {
        if (!start) return '-';
        const s = new Date(start);
        const e = end ? new Date(end) : new Date();
        const diff = Math.floor((e - s) / 1000);
        if (diff < 60) return `${diff}s`;
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        return `${mins}m ${secs}s`;
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading execution...</p>
            </div>
        );
    }

    if (!execution) {
        return <div className="error-state">Execution not found</div>;
    }

    const isPending = execution.status === 'in_progress' &&
        execution.logs?.length > 0 &&
        execution.logs[execution.logs.length - 1]?.status === 'pending';

    return (
        <div className="execution-view">
            <div className="page-header">
                <div>
                    <h1>📊 Execution Details</h1>
                    <p className="subtitle">ID: {execution._id}</p>
                </div>
                <div className="header-actions">
                    <button onClick={() => navigate('/audit')} className="btn btn-outline">← Audit Log</button>
                    {execution.status === 'in_progress' && (
                        <button onClick={handleCancel} className="btn btn-danger" disabled={actionLoading}>
                            ✕ Cancel
                        </button>
                    )}
                    {execution.status === 'failed' && (
                        <button onClick={handleRetry} className="btn btn-warning" disabled={actionLoading}>
                            🔄 Retry
                        </button>
                    )}
                </div>
            </div>

            {/* Status Card */}
            <div className="card execution-status-card">
                <div className="status-row">
                    <div className="status-item">
                        <label>Status</label>
                        <span className={`badge badge-lg ${getStatusColor(execution.status)}`}>
                            {execution.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="status-item">
                        <label>Version</label>
                        <span>v{execution.workflow_version}</span>
                    </div>
                    <div className="status-item">
                        <label>Triggered By</label>
                        <span>{execution.triggered_by}</span>
                    </div>
                    <div className="status-item">
                        <label>Duration</label>
                        <span>{getDuration(execution.started_at, execution.ended_at)}</span>
                    </div>
                    <div className="status-item">
                        <label>Retries</label>
                        <span>{execution.retries}</span>
                    </div>
                </div>
            </div>

            {/* Input Data */}
            <div className="card">
                <h2 className="card-title">📥 Input Data</h2>
                <div className="data-display">
                    {Object.entries(execution.data || {}).map(([key, val]) => (
                        <div key={key} className="data-item">
                            <span className="data-key">{key}</span>
                            <span className="data-value">{String(val)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Approval Actions */}
            {isPending && (
                <div className="card approval-card">
                    <h2 className="card-title">⏳ Awaiting Approval</h2>
                    <p>Step "<strong>{execution.logs[execution.logs.length - 1]?.step_name}</strong>" requires your action.</p>
                    <div className="approval-actions">
                        <button onClick={handleApprove} className="btn btn-success btn-lg" disabled={actionLoading}>
                            {actionLoading ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button onClick={handleReject} className="btn btn-danger btn-lg" disabled={actionLoading}>
                            {actionLoading ? 'Processing...' : '✕ Reject'}
                        </button>
                    </div>
                </div>
            )}

            {/* Execution Logs */}
            <div className="card">
                <h2 className="card-title">📜 Execution Logs</h2>
                {(execution.logs || []).length === 0 ? (
                    <p className="muted-text">No logs yet.</p>
                ) : (
                    <div className="execution-logs">
                        {execution.logs.map((log, index) => (
                            <div key={index} className={`log-entry ${log.status}`}>
                                <div className="log-header">
                                    <div className="log-step-info">
                                        <span className="log-number">{index + 1}</span>
                                        <strong>{log.step_name}</strong>
                                        <span className={`badge badge-${log.step_type === 'approval' ? 'warning' : log.step_type === 'notification' ? 'info' : 'neutral'}`}>
                                            {log.step_type}
                                        </span>
                                        <span className={`badge ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <span className="log-duration">
                                        {getDuration(log.started_at, log.ended_at)}
                                    </span>
                                </div>

                                {log.approver_id && (
                                    <div className="log-detail">
                                        <span className="detail-label">Approver:</span> {log.approver_id}
                                    </div>
                                )}

                                {log.error_message && (
                                    <div className="log-error">
                                        ⚠️ {log.error_message}
                                    </div>
                                )}

                                {log.evaluated_rules?.length > 0 && (
                                    <div className="log-rules">
                                        <strong>Rules Evaluated:</strong>
                                        <div className="rules-results">
                                            {log.evaluated_rules.map((er, i) => (
                                                <div key={i} className={`rule-result ${er.result ? 'matched' : 'unmatched'}`}>
                                                    <span className="rule-indicator">{er.result ? '✓' : '✗'}</span>
                                                    <code>{er.rule}</code>
                                                    <span className={`badge badge-sm ${er.result ? 'badge-success' : 'badge-danger'}`}>
                                                        {er.result ? 'MATCH' : 'NO MATCH'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {log.selected_next_step && (
                                    <div className="log-detail">
                                        <span className="detail-label">Next Step:</span>
                                        <span className="next-step-badge">{log.selected_next_step}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ExecutionView;
