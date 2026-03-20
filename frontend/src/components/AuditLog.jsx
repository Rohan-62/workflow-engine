import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExecutions } from '../api/api';

function AuditLog() {
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ pages: 1, total: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    const fetchExecutions = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 10 };
            if (statusFilter) params.status = statusFilter;
            const res = await getExecutions(params);
            setExecutions(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchExecutions();
    }, [page, statusFilter]);

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

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleString();
    };

    return (
        <div className="audit-log">
            <div className="page-header">
                <div>
                    <h1>📋 Audit Log</h1>
                    <p className="subtitle">Track all workflow executions</p>
                </div>
            </div>

            <div className="filter-bar">
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="form-input filter-select"
                >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="canceled">Canceled</option>
                    <option value="pending">Pending</option>
                </select>
                <span className="result-count">{pagination.total} execution{pagination.total !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading executions...</p>
                </div>
            ) : executions.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📊</span>
                    <h3>No executions found</h3>
                    <p>Execute a workflow to see results here</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Execution ID</th>
                                    <th>Workflow</th>
                                    <th>Version</th>
                                    <th>Status</th>
                                    <th>Triggered By</th>
                                    <th>Start Time</th>
                                    <th>End Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {executions.map(exec => (
                                    <tr key={exec._id}>
                                        <td><code className="exec-id">{exec._id.slice(0, 8)}...</code></td>
                                        <td><strong>{exec.workflow_name}</strong></td>
                                        <td><span className="badge badge-neutral">v{exec.workflow_version}</span></td>
                                        <td>
                                            <span className={`badge ${getStatusColor(exec.status)}`}>
                                                {exec.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>{exec.triggered_by}</td>
                                        <td>{formatDate(exec.started_at)}</td>
                                        <td>{formatDate(exec.ended_at)}</td>
                                        <td>
                                            <button
                                                onClick={() => navigate(`/executions/${exec._id}`)}
                                                className="btn btn-sm btn-outline"
                                            >
                                                👁️ View Logs
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {pagination.pages > 1 && (
                        <div className="pagination">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn btn-sm btn-outline"
                            >
                                ← Previous
                            </button>
                            <span className="page-info">Page {page} of {pagination.pages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="btn btn-sm btn-outline"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default AuditLog;
