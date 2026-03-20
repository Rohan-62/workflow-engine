const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Workflow = require('./models/Workflow');
const Step = require('./models/Step');
const Rule = require('./models/Rule');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected for seeding...');

        // Clear existing data
        await Rule.deleteMany({});
        await Step.deleteMany({});
        await Workflow.deleteMany({});
        console.log('Cleared existing data');

        // === WORKFLOW 1: Expense Approval ===
        const expenseWorkflow = await Workflow.create({
            name: 'Expense Approval',
            description: 'Approves expense requests based on amount, country, department, and priority.',
            input_schema: {
                amount: { type: 'number', required: true },
                country: { type: 'string', required: true },
                department: { type: 'string', required: false },
                priority: { type: 'string', required: true, allowed_values: ['High', 'Medium', 'Low'] }
            }
        });

        const step1 = await Step.create({
            workflow_id: expenseWorkflow._id,
            name: 'Manager Approval',
            step_type: 'approval',
            order: 1,
            metadata: { assignee_email: 'manager@example.com', instructions: 'Review the expense request and approve or reject.' }
        });

        const step2 = await Step.create({
            workflow_id: expenseWorkflow._id,
            name: 'Finance Notification',
            step_type: 'notification',
            order: 2,
            metadata: { notification_channel: 'email', template: 'finance_review', recipient: 'finance@example.com' }
        });

        const step3 = await Step.create({
            workflow_id: expenseWorkflow._id,
            name: 'CEO Approval',
            step_type: 'approval',
            order: 3,
            metadata: { assignee_email: 'ceo@example.com', instructions: 'Final approval for high-value expenses.' }
        });

        const step4 = await Step.create({
            workflow_id: expenseWorkflow._id,
            name: 'Task Completion',
            step_type: 'task',
            order: 4,
            metadata: { action: 'mark_complete', instructions: 'Process payment and close expense request.' }
        });

        const step5 = await Step.create({
            workflow_id: expenseWorkflow._id,
            name: 'Task Rejection',
            step_type: 'task',
            order: 5,
            metadata: { action: 'reject', instructions: 'Notify requester of rejection.' }
        });

        // Set start step
        expenseWorkflow.start_step_id = step1._id;
        await expenseWorkflow.save();

        // Rules for Manager Approval
        await Rule.create([
            { step_id: step1._id, condition: "amount > 100 && country == 'US' && priority == 'High'", next_step_id: step2._id, priority: 1 },
            { step_id: step1._id, condition: "amount <= 100 || department == 'HR'", next_step_id: step3._id, priority: 2 },
            { step_id: step1._id, condition: "priority == 'Low' && country != 'US'", next_step_id: step5._id, priority: 3 },
            { step_id: step1._id, condition: 'DEFAULT', next_step_id: step5._id, priority: 4 }
        ]);

        // Rules for Finance Notification
        await Rule.create([
            { step_id: step2._id, condition: 'amount > 500', next_step_id: step3._id, priority: 1 },
            { step_id: step2._id, condition: 'DEFAULT', next_step_id: step4._id, priority: 2 }
        ]);

        // Rules for CEO Approval
        await Rule.create([
            { step_id: step3._id, condition: 'DEFAULT', next_step_id: step4._id, priority: 1 }
        ]);

        // step4 (Task Completion) and step5 (Task Rejection) have no rules → workflow ends

        console.log('✅ Expense Approval workflow created');

        // === WORKFLOW 2: Employee Onboarding ===
        const onboardingWorkflow = await Workflow.create({
            name: 'Employee Onboarding',
            description: 'Onboards new employees with HR review, IT setup, and manager notification.',
            input_schema: {
                employee_name: { type: 'string', required: true },
                department: { type: 'string', required: true },
                role: { type: 'string', required: true },
                start_date: { type: 'string', required: true },
                needs_laptop: { type: 'string', required: false, allowed_values: ['Yes', 'No'] }
            }
        });

        const ob1 = await Step.create({
            workflow_id: onboardingWorkflow._id,
            name: 'HR Review',
            step_type: 'approval',
            order: 1,
            metadata: { assignee_email: 'hr@example.com', instructions: 'Verify employee documents and approve onboarding.' }
        });

        const ob2 = await Step.create({
            workflow_id: onboardingWorkflow._id,
            name: 'IT Setup',
            step_type: 'task',
            order: 2,
            metadata: { action: 'create_accounts', instructions: 'Set up email, Slack, and system access.' }
        });

        const ob3 = await Step.create({
            workflow_id: onboardingWorkflow._id,
            name: 'Equipment Request',
            step_type: 'task',
            order: 3,
            metadata: { action: 'order_equipment', instructions: 'Order laptop and peripherals.' }
        });

        const ob4 = await Step.create({
            workflow_id: onboardingWorkflow._id,
            name: 'Manager Notification',
            step_type: 'notification',
            order: 4,
            metadata: { notification_channel: 'email', template: 'new_employee', recipient: 'manager@example.com' }
        });

        const ob5 = await Step.create({
            workflow_id: onboardingWorkflow._id,
            name: 'Onboarding Complete',
            step_type: 'task',
            order: 5,
            metadata: { action: 'complete', instructions: 'Mark onboarding as complete.' }
        });

        onboardingWorkflow.start_step_id = ob1._id;
        await onboardingWorkflow.save();

        // Rules for HR Review
        await Rule.create([
            { step_id: ob1._id, condition: 'DEFAULT', next_step_id: ob2._id, priority: 1 }
        ]);

        // Rules for IT Setup
        await Rule.create([
            { step_id: ob2._id, condition: "needs_laptop == 'Yes'", next_step_id: ob3._id, priority: 1 },
            { step_id: ob2._id, condition: 'DEFAULT', next_step_id: ob4._id, priority: 2 }
        ]);

        // Rules for Equipment Request
        await Rule.create([
            { step_id: ob3._id, condition: 'DEFAULT', next_step_id: ob4._id, priority: 1 }
        ]);

        // Rules for Manager Notification
        await Rule.create([
            { step_id: ob4._id, condition: 'DEFAULT', next_step_id: ob5._id, priority: 1 }
        ]);

        console.log('✅ Employee Onboarding workflow created');
        console.log('\n🎉 Seed complete! 2 workflows with steps and rules created.');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();
