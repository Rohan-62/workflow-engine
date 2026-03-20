const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/workflows', require('./routes/workflowRoutes'));
app.use('/api/workflows/:workflow_id/steps', require('./routes/stepRoutes'));
app.use('/api/steps', require('./routes/stepRoutes'));
app.use('/api/steps/:step_id/rules', require('./routes/ruleRoutes'));
app.use('/api/rules', require('./routes/ruleRoutes'));
app.use('/api/executions', require('./routes/executionRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, '../', 'frontend', 'dist', 'index.html'));
    });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
