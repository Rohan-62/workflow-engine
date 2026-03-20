# Halleyx Workflow Engine - Full Stack Challenge

A dynamic and scalable MERN stack (MongoDB, Express, React, Node.js) application that allows users to design, execute, and monitor complete business workflows with complex dynamic rules, branching logic, approvals, and automated tasks.

## 🚀 Features

### Core Capabilities
- **Workflow Builder**: Design custom business processes visually with schemas and sequential steps.
- **Rule Engine**: Dynamic evaluation of rules during execution (e.g., `amount > 500 && country == 'US'`). Supports nested logic, functions (`contains`, `startsWith`, `endsWith`), arithmetic, and default fallback.
- **Execution Manager**: Process workflows step-by-step, evaluating conditions at each crossroad to determine the next path. Supports `pending` approvals, retry logic, error handling, and max-iteration infinite loop protection.
- **Modern UI**: Full-fledged React frontend with a clean, light-mode interface displaying visual progress of execution and audit logs.

### Step Types Supported
- **Task**: Automatic processes that execute immediately.
- **Approval**: Halts workflow execution pending manual user intervention (Approve / Reject).
- **Notification**: Automated alerts (e.g., Email, Slack).

---

## 🛠️ Architecture

### Backend (Node.js/Express)
The backend uses **Mongoose (MongoDB)** to model `Workflows`, `Steps`, `Rules`, and `Executions`. 
The core of the system lies in the `RuleEvaluator.js` engine which dynamically parses and computes logical condition strings against incoming JSON data safely (without using potentially dangerous `eval()`).
The `ExecutionController` processes workflow chains iteratively using recursion and tracking iteration counts to prevent loop traps.

### Frontend (React/Vite)
The UI is a fast Next-gen SPA powered by **Vite**. Component logic communicates seamlessly via **Axios** pointing dynamically via environment variables (`VITE_API_URL`) to support ease of deployment. 

---

## 📦 Setup Instructions

Requires Node.js v16+ and MongoDB (running locally or a connection string from Atlas).

### 1. Database & Backend Config
```bash
cd backend
npm install
cp .env.example .env   # Modify MONGODB_URI if required
```

### 2. Frontend Config
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL defaults to https://workflow-engine-w0mt.onrender.com/api
```

### 3. Running Locally
Terminal 1 (Backend + Seed Data):
```bash
cd backend
npm run seed  # Generates Sample Workflows (Expense Approval & Onboarding)
npm run dev   # Starts backend server on port 5000
```
Terminal 2 (Frontend):
```bash
cd frontend
npm run dev   # Starts Vite React dev server
```

---

## 💻 Automated Tests
The rule evaluator engine comes with extensive automated testing using Jest.
```bash
cd backend
npm test
```

## 🎥 Sample Workflows included via Seeder:
1. **Expense Approval**: Auto-approves amounts under 100, requires manager for normal, and CEO for amounts > 500.
2. **Employee Onboarding**: Allocates tasks and notifies management conditionally based on laptop requirement flags.
