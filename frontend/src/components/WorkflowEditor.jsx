import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createWorkflow, updateWorkflow, createStep, updateStep, deleteStep } from '../api/api';
import RuleEditor from './RuleEditor';

function WorkflowEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [workflow, setWorkflow] = useState({
        name: '',
        description: '',
        input_schema: {},
        start_step_id: null
    });
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeRuleStep, setActiveRuleStep] = useState(null);

    // Schema editor state
    const [schemaFields, setSchemaFields] = useState([]);
    const [showStepModal, setShowStepModal] = useState(false);
    const [editingStep, setEditingStep] = useState(null);
    const [stepForm, setStepForm] = useState({ name: '', step_type: 'task', order: 1, metadata: {} });

    useEffect(() => {
        if (!isNew) {
            fetchWorkflow();
        }
    }, [id]);

    const fetchWorkflow = async () => {
        try {
            const res = await getWorkflow(id);
            const data = res.data.data;
            setWorkflow({
                name: data.name,
                description: data.description || '',
                input_schema: data.input_schema || {},
                start_step_id: data.start_step_id
            });
            setSteps(data.steps || []);

            // Parse schema to fields array
            const fields = Object.entries(data.input_schema || {}).map(([key, val]) => ({
                name: key,
                type: val.type || 'string',
                required: val.required || false,
                allowed_values: val.allowed_values ? val.allowed_values.join(', ') : ''
            }));
            setSchemaFields(fields);
        } catch (err) {
            console.error('Error fetching workflow:', err);
        }
        setLoading(false);
    };

    const buildSchema = () => {
        const schema = {};
        schemaFields.forEach(f => {
            schema[f.name] = {
                type: f.type,
                required: f.required
            };
            if (f.allowed_values) {
                schema[f.name].allowed_values = f.allowed_values.split(',').map(v => v.trim()).filter(Boolean);
            }
        });
        return schema;
    };

    const handleSaveWorkflow = async () => {
        setSaving(true);
        try {
            const payload = {
                name: workflow.name,
                description: workflow.description,
                input_schema: buildSchema(),
                start_step_id: workflow.start_step_id
            };

            if (isNew) {
                const res = await createWorkflow(payload);
                navigate(`/workflows/${res.data.data._id}/edit`);
            } else {
                await updateWorkflow(id, payload);
                await fetchWorkflow();
            }
        } catch (err) {
            console.error('Error saving workflow:', err);
            alert('Error saving workflow: ' + (err.response?.data?.error || err.message));
        }
        setSaving(false);
    };

    // Schema field management
    const addSchemaField = () => {
        setSchemaFields([...schemaFields, { name: '', type: 'string', required: false, allowed_values: '' }]);
    };

    const removeSchemaField = (index) => {
        setSchemaFields(schemaFields.filter((_, i) => i !== index));
    };

    const updateSchemaField = (index, field, value) => {
        const updated = [...schemaFields];
        updated[index][field] = value;
        setSchemaFields(updated);
    };

    // Step management
    const openStepModal = (step = null) => {
        if (step) {
            setEditingStep(step._id);
            setStepForm({
                name: step.name,
                step_type: step.step_type,
                order: step.order,
                metadata: step.metadata || {}
            });
        } else {
            setEditingStep(null);
            setStepForm({
                name: '',
                step_type: 'task',
                order: steps.length + 1,
                metadata: {}
            });
        }
        setShowStepModal(true);
    };

    const handleSaveStep = async () => {
        try {
            if (editingStep) {
                await updateStep(editingStep, stepForm);
            } else {
                await createStep(id, stepForm);
            }
            await fetchWorkflow();
            setShowStepModal(false);
        } catch (err) {
            console.error('Error saving step:', err);
            alert('Error saving step: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteStep = async (stepId, stepName) => {
        if (window.confirm(`Delete step "${stepName}"?`)) {
            try {
                await deleteStep(stepId);
                await fetchWorkflow();
            } catch (err) {
                console.error('Error deleting step:', err);
            }
        }
    };

    const setStartStep = async (stepId) => {
        try {
            await updateWorkflow(id, { start_step_id: stepId });
            setWorkflow({ ...workflow, start_step_id: stepId });
        } catch (err) {
            console.error('Error setting start step:', err);
        }
    };

    const handleMetadataChange = (key, value) => {
        setStepForm({
            ...stepForm,
            metadata: { ...stepForm.metadata, [key]: value }
        });
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Loading workflow...</p>
            </div>
        );
    }

    return (
        <div className="workflow-editor">
            <div className="page-header">
                <div>
                    <h1>{isNew ? 'Create Workflow' : `Edit: ${workflow.name}`}</h1>
                    {!isNew && <p className="subtitle">Version {workflow.version || 1}</p>}
                </div>
                <div className="header-actions">
                    <button onClick={() => navigate('/workflows')} className="btn btn-outline">← Back</button>
                    <button onClick={handleSaveWorkflow} className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Workflow'}
                    </button>
                </div>
            </div>

            {/* Workflow Details */}
            <div className="card">
                <h2 className="card-title">📝 Workflow Details</h2>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Workflow Name</label>
                        <input
                            type="text"
                            value={workflow.name}
                            onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
                            placeholder="e.g., Expense Approval"
                            className="form-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={workflow.description}
                            onChange={(e) => setWorkflow({ ...workflow, description: e.target.value })}
                            placeholder="Describe what this workflow does..."
                            className="form-input"
                            rows={3}
                        />
                    </div>
                </div>
            </div>

            {/* Input Schema */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">📋 Input Schema</h2>
                    <button onClick={addSchemaField} className="btn btn-sm btn-primary">+ Add Field</button>
                </div>
                {schemaFields.length === 0 ? (
                    <p className="muted-text">No input fields defined. Click "Add Field" to define the data your workflow will accept.</p>
                ) : (
                    <div className="schema-fields">
                        {schemaFields.map((field, index) => (
                            <div key={index} className="schema-field-row">
                                <input
                                    type="text"
                                    placeholder="Field name"
                                    value={field.name}
                                    onChange={(e) => updateSchemaField(index, 'name', e.target.value)}
                                    className="form-input"
                                />
                                <select
                                    value={field.type}
                                    onChange={(e) => updateSchemaField(index, 'type', e.target.value)}
                                    className="form-input"
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                </select>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateSchemaField(index, 'required', e.target.checked)}
                                    />
                                    Required
                                </label>
                                <input
                                    type="text"
                                    placeholder="Allowed values (comma-separated)"
                                    value={field.allowed_values}
                                    onChange={(e) => updateSchemaField(index, 'allowed_values', e.target.value)}
                                    className="form-input"
                                />
                                <button onClick={() => removeSchemaField(index)} className="btn btn-sm btn-danger">✕</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Steps */}
            {!isNew && (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">📌 Steps</h2>
                        <button onClick={() => openStepModal()} className="btn btn-sm btn-primary">+ Add Step</button>
                    </div>
                    {steps.length === 0 ? (
                        <p className="muted-text">No steps yet. Add your first step to define the workflow process.</p>
                    ) : (
                        <div className="steps-list">
                            {steps.map((step) => (
                                <div key={step._id} className={`step-card ${workflow.start_step_id === step._id ? 'start-step' : ''}`}>
                                    <div className="step-header">
                                        <div className="step-info">
                                            <span className="step-order">{step.order}</span>
                                            <div>
                                                <h3>{step.name}</h3>
                                                <span className={`badge badge-${step.step_type === 'approval' ? 'warning' : step.step_type === 'notification' ? 'info' : 'neutral'}`}>
                                                    {step.step_type}
                                                </span>
                                                {workflow.start_step_id === step._id && (
                                                    <span className="badge badge-success">Start Step</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="step-actions">
                                            {workflow.start_step_id !== step._id && (
                                                <button onClick={() => setStartStep(step._id)} className="btn btn-sm btn-outline" title="Set as start step">
                                                    🏁 Set Start
                                                </button>
                                            )}
                                            <button onClick={() => setActiveRuleStep(activeRuleStep === step._id ? null : step._id)} className="btn btn-sm btn-outline">
                                                📐 Rules {activeRuleStep === step._id ? '▲' : '▼'}
                                            </button>
                                            <button onClick={() => openStepModal(step)} className="btn btn-sm btn-outline">✏️ Edit</button>
                                            <button onClick={() => handleDeleteStep(step._id, step.name)} className="btn btn-sm btn-danger">🗑️</button>
                                        </div>
                                    </div>
                                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                                        <div className="step-metadata">
                                            {Object.entries(step.metadata).map(([key, val]) => (
                                                <span key={key} className="metadata-tag">{key}: {val}</span>
                                            ))}
                                        </div>
                                    )}
                                    {activeRuleStep === step._id && (
                                        <RuleEditor stepId={step._id} steps={steps} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Step Modal */}
            {showStepModal && (
                <div className="modal-overlay" onClick={() => setShowStepModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>{editingStep ? 'Edit Step' : 'Add Step'}</h2>
                        <div className="form-group">
                            <label>Step Name</label>
                            <input
                                type="text"
                                value={stepForm.name}
                                onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                                placeholder="e.g., Manager Approval"
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Step Type</label>
                            <select
                                value={stepForm.step_type}
                                onChange={(e) => setStepForm({ ...stepForm, step_type: e.target.value })}
                                className="form-input"
                            >
                                <option value="task">Task</option>
                                <option value="approval">Approval</option>
                                <option value="notification">Notification</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Order</label>
                            <input
                                type="number"
                                value={stepForm.order}
                                onChange={(e) => setStepForm({ ...stepForm, order: parseInt(e.target.value) || 1 })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Metadata</label>
                            <div className="metadata-editor">
                                {stepForm.step_type === 'approval' && (
                                    <div className="form-group">
                                        <label>Assignee Email</label>
                                        <input
                                            type="email"
                                            value={stepForm.metadata.assignee_email || ''}
                                            onChange={(e) => handleMetadataChange('assignee_email', e.target.value)}
                                            placeholder="approver@example.com"
                                            className="form-input"
                                        />
                                    </div>
                                )}
                                {stepForm.step_type === 'notification' && (
                                    <>
                                        <div className="form-group">
                                            <label>Channel</label>
                                            <select
                                                value={stepForm.metadata.notification_channel || 'email'}
                                                onChange={(e) => handleMetadataChange('notification_channel', e.target.value)}
                                                className="form-input"
                                            >
                                                <option value="email">Email</option>
                                                <option value="slack">Slack</option>
                                                <option value="ui">UI Alert</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Recipient</label>
                                            <input
                                                type="text"
                                                value={stepForm.metadata.recipient || ''}
                                                onChange={(e) => handleMetadataChange('recipient', e.target.value)}
                                                placeholder="recipient@example.com"
                                                className="form-input"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group">
                                    <label>Instructions</label>
                                    <textarea
                                        value={stepForm.metadata.instructions || ''}
                                        onChange={(e) => handleMetadataChange('instructions', e.target.value)}
                                        placeholder="Instructions for this step..."
                                        className="form-input"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowStepModal(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={handleSaveStep} className="btn btn-primary">
                                {editingStep ? 'Update Step' : 'Add Step'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkflowEditor;
