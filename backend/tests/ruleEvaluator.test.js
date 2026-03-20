const { evaluateCondition } = require('../engine/ruleEvaluator');

describe('Rule Evaluator Engine', () => {
    test('Evaluates DEFAULT to true', () => {
        expect(evaluateCondition('DEFAULT', {})).toBe(true);
    });

    test('Evaluates simple comparisons', () => {
        const data = { amount: 150 };
        expect(evaluateCondition('amount > 100', data)).toBe(true);
        expect(evaluateCondition('amount <= 100', data)).toBe(false);
        expect(evaluateCondition('amount == 150', data)).toBe(true);
        expect(evaluateCondition('amount != 200', data)).toBe(true);
    });

    test('Evaluates strings and equality', () => {
        const data = { country: 'US', role: 'admin' };
        expect(evaluateCondition("country == 'US'", data)).toBe(true);
        expect(evaluateCondition('role == "admin"', data)).toBe(true);
        expect(evaluateCondition("country == 'IN'", data)).toBe(false);
    });

    test('Evaluates logical AND', () => {
        const data = { amount: 150, country: 'US' };
        expect(evaluateCondition("amount > 100 && country == 'US'", data)).toBe(true);
        expect(evaluateCondition("amount > 200 && country == 'US'", data)).toBe(false);
    });

    test('Evaluates logical OR', () => {
        const data = { amount: 50, country: 'US' };
        expect(evaluateCondition("amount > 100 || country == 'US'", data)).toBe(true);
        expect(evaluateCondition("amount > 100 || country == 'UK'", data)).toBe(false);
    });

    test('Evaluates string functions contains, startsWith, endsWith', () => {
        const data = { email: 'user@company.com', department: 'IT_Support' };
        expect(evaluateCondition("contains(email, 'company.com')", data)).toBe(true);
        expect(evaluateCondition("startsWith(department, 'IT')", data)).toBe(true);
        expect(evaluateCondition("endsWith(email, '.com')", data)).toBe(true);
        expect(evaluateCondition("contains(email, 'yahoo')", data)).toBe(false);
    });

    test('Throws error for empty condition', () => {
        expect(() => evaluateCondition('', {})).toThrow('Empty condition');
        expect(() => evaluateCondition('   ', {})).toThrow('Empty condition');
    });

    test('Nested properties work with dot notation', () => {
        const data = { user: { profile: { age: 30 } } };
        expect(evaluateCondition("user.profile.age >= 21", data)).toBe(true);
    });
});
