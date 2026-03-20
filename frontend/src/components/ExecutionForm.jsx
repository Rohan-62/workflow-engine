import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, executeWorkflow } from '../api/api';
import ExecutionView from './ExecutionView';

function ExecutionForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workflow, setWorkflow] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [executionId, setExecutionId] = useState(null);

    useEffect(() => {
        fetchWorkflow();
    }, [id]);

    const fetchWorkflow = async () => {
        try {
            const res = await getWorkflow(id);
            setWorkflow(res.data.data);

            // Initialize form data from schema
            const initialData = {};
            const schema = res.data.data.input_schema || {};
            Object.entries(schema).forEach(([key, config]) => {
                if (config.type === 'number') initialData[key] = '';
                else if (config.type === 'boolean') initialData[key] = false;
                else if (config.allowed_values?.length > 0) initialData[key] = config.allowed_values[0];
                else initialData[key] = '';
            });
            setFormData(initialData);
        } catch (err) {
            console.error('Error:', err);
        }
        setLoading(false);
    };

    const handleExecute = async () => {
        setExecuting(true);
        try {
            // Convert number types
            const processedData = {};
            const schema = workflow.input_schema || {};
            Object.entries(formData).forEach(([key, value]) => {
                if (schema[key]?.type === 'number') {
                    processedData[key] = Number(value);
                } else {
                    processedData[key] = value;
                }
            });

            const res = await executeWorkflow(id, {
                data: processedData,
                triggered_by: 'user'
            });
            setExecutionId(res.data.data._id);
        } catch (err) {
            console.error('Execution error:', err);
            alert('Execution failed: ' + (err.response?.data?.messages?.join(', ') || err.response?.data?.error || err.message));
        }
        setExecuting(false);
    };

    const handleInputChange = (key, value) => {
        setFormData({ ...formData, [key]: value });
    };

    const renderInput = (key, config) => {
        if (config.allowed_values?.length > 0) {
            return (
                <select
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="form-input"
                >
                    {config.allowed_values.map(val => (
                        <option key={val} value={val}>{val}</option>
                    ))}
                </select>
            );
        }

        if (config.type === 'number') {
            return (
                <input
                    type="number"
                    value={formData[key] || ''}
                    onChange={(e) => handleInputChange(key, e.target.value)}
                    className="form-input"
                    placeholder={`Enter ${key}`}
                />
            );
        }

        if (config.type === 'boolean') {
            return (
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={formData[key] || false}
                        onChange={(e) => handleInputChange(key, e.target.checked)}
                    />
                    {key}
                </label>
            );
        }

        return (
            <input
                type="text"
                value={formData[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="form-input"
                placeholder={`Enter ${key}`}
            />
        );
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading workflow...</p>
            </div>
        );
    }

    if (!workflow) {
        return <div className="error-state">Workflow not found</div>;
    }

    // If execution started, show the execution view
    if (executionId) {
        return <ExecutionView executionId={executionId} />;
    }

    const schema = workflow.input_schema || {};

    return (
        <div className="execution-form">
            <div className="page-header">
                <div>
                    <h1>▶️ Execute Workflow</h1>
                    <p className="subtitle">{workflow.name} (v{workflow.version})</p>
                </div>
                <button onClick={() => navigate('/workflows')} className="btn btn-outline">← Back</button>
            </div>

            <div className="card">
                <h2 className="card-title">📊 Input Data</h2>
                <p className="card-desc">Provide the required input values to start this workflow.</p>

                {Object.keys(schema).length === 0 ? (
                    <p className="muted-text">This workflow has no input schema. You can execute it directly.</p>
                ) : (
                    <div className="input-fields">
                        {Object.entries(schema).map(([key, config]) => (
                            <div key={key} className="form-group">
                                <label>
                                    {key}
                                    <span className={`type-badge ${config.type}`}>{config.type}</span>
                                    {config.required && <span className="required-star">*</span>}
                                </label>
                                {renderInput(key, config)}
                            </div>
                        ))}
                    </div>
                )}

                <div className="form-actions execute-actions">
                    <button
                        onClick={handleExecute}
                        className="btn btn-success btn-lg"
                        disabled={executing}
                    >
                        {executing ? (
                            <>
                                <span className="spinner-sm"></span> Executing...
                            </>
                        ) : (
                            '▶️ Start Execution'
                        )}
                    </button>
                </div>
            </div>

            {/* Steps Preview */}
            <div className="card">
                <h2 className="card-title">📌 Workflow Steps</h2>
                <div className="steps-preview">
                    {(workflow.steps || []).sort((a, b) => a.order - b.order).map((step, i) => (
                        <div key={step._id} className="step-preview">
                            <div className="step-preview-number">{i + 1}</div>
                            <div className="step-preview-info">
                                <strong>{step.name}</strong>
                                <span className={`badge badge-${step.step_type === 'approval' ? 'warning' : step.step_type === 'notification' ? 'info' : 'neutral'}`}>
                                    {step.step_type}
                                </span>
                            </div>
                            {i < (workflow.steps || []).length - 1 && <div className="step-arrow">→</div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ExecutionForm;
