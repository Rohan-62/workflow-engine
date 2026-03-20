import { useState, useEffect } from 'react';
import { getRules, createRule, updateRule, deleteRule } from '../api/api';

function RuleEditor({ stepId, steps }) {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [form, setForm] = useState({ condition: '', next_step_id: '', priority: 1 });
    const [dragIndex, setDragIndex] = useState(null);

    useEffect(() => {
        fetchRules();
    }, [stepId]);

    const fetchRules = async () => {
        try {
            const res = await getRules(stepId);
            setRules(res.data.data);
        } catch (err) {
            console.error('Error fetching rules:', err);
        }
        setLoading(false);
    };

    const openForm = (rule = null) => {
        if (rule) {
            setEditingRule(rule._id);
            setForm({
                condition: rule.condition,
                next_step_id: rule.next_step_id || '',
                priority: rule.priority
            });
        } else {
            setEditingRule(null);
            setForm({
                condition: '',
                next_step_id: '',
                priority: rules.length + 1
            });
        }
        setShowForm(true);
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...form,
                next_step_id: form.next_step_id || null
            };

            if (editingRule) {
                await updateRule(editingRule, payload);
            } else {
                await createRule(stepId, payload);
            }
            await fetchRules();
            setShowForm(false);
        } catch (err) {
            console.error('Error saving rule:', err);
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (ruleId) => {
        if (window.confirm('Delete this rule?')) {
            try {
                await deleteRule(ruleId);
                await fetchRules();
            } catch (err) {
                console.error('Error deleting rule:', err);
            }
        }
    };

    // Drag and drop for reordering
    const handleDragStart = (index) => {
        setDragIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;

        const newRules = [...rules];
        const draggedRule = newRules[dragIndex];
        newRules.splice(dragIndex, 1);
        newRules.splice(index, 0, draggedRule);

        // Reassign priorities
        newRules.forEach((rule, i) => {
            rule.priority = i + 1;
        });

        setRules(newRules);
        setDragIndex(index);
    };

    const handleDragEnd = async () => {
        setDragIndex(null);
        // Save new priorities
        for (const rule of rules) {
            try {
                await updateRule(rule._id, { priority: rule.priority });
            } catch (err) {
                console.error('Error updating priority:', err);
            }
        }
    };

    const otherSteps = steps.filter(s => s._id !== stepId);

    if (loading) return <div className="rule-loading">Loading rules...</div>;

    return (
        <div className="rule-editor">
            <div className="rule-header">
                <h4>📐 Rules</h4>
                <button onClick={() => openForm()} className="btn btn-sm btn-primary">+ Add Rule</button>
            </div>

            <div className="rule-hint">
                <strong>Tip:</strong> Rules are evaluated by priority (lowest first). Use <code>DEFAULT</code> as a catch-all.
                Operators: <code>==</code> <code>!=</code> <code>&gt;</code> <code>&lt;</code> <code>&gt;=</code> <code>&lt;=</code> <code>&&</code> <code>||</code> |
                Functions: <code>contains(field, "val")</code> <code>startsWith(field, "val")</code> <code>endsWith(field, "val")</code>
            </div>

            {rules.length === 0 ? (
                <p className="muted-text">No rules defined. Without rules, the workflow will end at this step.</p>
            ) : (
                <div className="rules-table-container">
                    <table className="data-table rules-table">
                        <thead>
                            <tr>
                                <th width="60">⇅</th>
                                <th width="70">Priority</th>
                                <th>Condition</th>
                                <th>Next Step</th>
                                <th width="120">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule, index) => (
                                <tr
                                    key={rule._id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={dragIndex === index ? 'dragging' : ''}
                                >
                                    <td className="drag-handle">⠿</td>
                                    <td><span className="badge badge-neutral">{rule.priority}</span></td>
                                    <td>
                                        <code className={rule.condition === 'DEFAULT' ? 'default-rule' : ''}>
                                            {rule.condition}
                                        </code>
                                    </td>
                                    <td>
                                        {rule.next_step_id ? (
                                            <span className="next-step-badge">
                                                {steps.find(s => s._id === rule.next_step_id)?.name || 'Unknown Step'}
                                            </span>
                                        ) : (
                                            <span className="badge badge-danger">END</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => openForm(rule)} className="btn btn-xs btn-outline">✏️</button>
                                            <button onClick={() => handleDelete(rule._id)} className="btn btn-xs btn-danger">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Rule Form */}
            {showForm && (
                <div className="rule-form">
                    <h4>{editingRule ? 'Edit Rule' : 'Add Rule'}</h4>
                    <div className="form-group">
                        <label>Condition</label>
                        <input
                            type="text"
                            value={form.condition}
                            onChange={(e) => setForm({ ...form, condition: e.target.value })}
                            placeholder="e.g., amount > 100 && country == 'US' or DEFAULT"
                            className="form-input condition-input"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Next Step</label>
                            <select
                                value={form.next_step_id}
                                onChange={(e) => setForm({ ...form, next_step_id: e.target.value })}
                                className="form-input"
                            >
                                <option value="">-- End Workflow --</option>
                                {otherSteps.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Priority</label>
                            <input
                                type="number"
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
                                className="form-input"
                                min={1}
                            />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
                        <button onClick={handleSave} className="btn btn-primary">
                            {editingRule ? 'Update Rule' : 'Add Rule'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RuleEditor;
