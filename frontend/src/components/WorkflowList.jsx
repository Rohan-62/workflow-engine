import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from '../api/api';

function WorkflowList() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ pages: 1, total: 0 });
    const navigate = useNavigate();

    const fetchWorkflows = async () => {
        setLoading(true);
        try {
            const res = await getWorkflows({ page, limit: 10, search });
            setWorkflows(res.data.data);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error fetching workflows:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchWorkflows();
    }, [page, search]);

    const handleDelete = async (id, name) => {
        if (window.confirm(`Delete workflow "${name}"? This will also delete all steps, rules, and executions.`)) {
            try {
                await deleteWorkflow(id);
                fetchWorkflows();
            } catch (err) {
                console.error('Error deleting workflow:', err);
            }
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    return (
        <div className="workflow-list">
            <div className="page-header">
                <div>
                    <h1>Workflows</h1>
                    <p className="subtitle">Manage your automation workflows</p>
                </div>
                <Link to="/workflows/new" className="btn btn-primary">
                    <span>+</span> Create Workflow
                </Link>
            </div>

            <div className="search-bar">
                <input
                    type="text"
                    placeholder="🔍 Search workflows..."
                    value={search}
                    onChange={handleSearch}
                    className="search-input"
                />
                <span className="result-count">{pagination.total} workflow{pagination.total !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading workflows...</p>
                </div>
            ) : workflows.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📦</span>
                    <h3>No workflows found</h3>
                    <p>Create your first workflow to get started</p>
                    <Link to="/workflows/new" className="btn btn-primary">Create Workflow</Link>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Steps</th>
                                    <th>Version</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workflows.map((workflow) => (
                                    <tr key={workflow._id}>
                                        <td>
                                            <div className="workflow-name">
                                                <span className="workflow-icon">🔄</span>
                                                <div>
                                                    <strong>{workflow.name}</strong>
                                                    {workflow.description && <p className="desc-text">{workflow.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="badge badge-info">{workflow.step_count}</span></td>
                                        <td><span className="badge badge-neutral">v{workflow.version}</span></td>
                                        <td>
                                            <span className={`badge ${workflow.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                {workflow.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>{new Date(workflow.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => navigate(`/workflows/${workflow._id}/edit`)} className="btn btn-sm btn-outline" title="Edit">
                                                    ✏️ Edit
                                                </button>
                                                <button onClick={() => navigate(`/workflows/${workflow._id}/execute`)} className="btn btn-sm btn-success" title="Execute">
                                                    ▶️ Execute
                                                </button>
                                                <button onClick={() => handleDelete(workflow._id, workflow.name)} className="btn btn-sm btn-danger" title="Delete">
                                                    🗑️
                                                </button>
                                            </div>
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

export default WorkflowList;
