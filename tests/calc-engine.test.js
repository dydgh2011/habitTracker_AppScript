import { describe, it, expect } from 'vitest';
import { evaluate, getDependencies } from '../js/utils/calc-engine.js';

describe('Calculation Engine', () => {

    describe('evaluate() - Basic Arithmetic', () => {
        it('should handle addition and subtraction', () => {
            expect(evaluate('10 + 5', {})).toBe(15);
            expect(evaluate('10 - 5', {})).toBe(5);
            expect(evaluate('-10 + 5', {})).toBe(-5);
        });

        it('should handle multiplication and division', () => {
            expect(evaluate('10 * 5', {})).toBe(50);
            expect(evaluate('10 / 5', {})).toBe(2);
        });

        it('should respect order of operations (PEMDAS)', () => {
            expect(evaluate('10 + 5 * 2', {})).toBe(20);
            expect(evaluate('(10 + 5) * 2', {})).toBe(30);
            expect(evaluate('100 / (10 + 15)', {})).toBe(4);
        });
    });

    describe('evaluate() - Field Variables', () => {
        const context = {
            'Running Distance': 5,
            'Running Time': 30,
            'Calories': 400
        };

        it('should insert field variables correctly', () => {
            // 5 / (30 / 60) -> 5 / 0.5 -> 10 (pace)
            expect(evaluate('Running Distance / (Running Time / 60)', context)).toBe(10);
        });

        it('should handle complex expressions mixing variables and literals', () => {
            expect(evaluate('(Calories * 2) - Running Distance', context)).toBe(795);
        });

        it('should return null if a referenced field is completely missing', () => {
            expect(evaluate('Running Distance + Swimming Distance', context)).toBe(null);
        });

        it('should return null if a referenced field is literally null', () => {
            const badContext = {
                'A': 10,
                'B': null
            };
            expect(evaluate('A + B', badContext)).toBe(null);
        });
    });

    describe('evaluate() - Edge Cases', () => {
        it('should gracefully return null for division by zero', () => {
            expect(evaluate('10 / 0', {})).toBe(null);
            expect(evaluate('10 / (5 - 5)', {})).toBe(null);
        });

        it('should handle messy whitespace', () => {
            expect(evaluate('  10   +   5 ', {})).toBe(15);
        });

        it('should gracefully handle malformed expressions', () => {
            expect(evaluate('10 + * 5', {})).toBe(null);
            expect(evaluate('10 + (5', {})).toBe(null);
            expect(evaluate(null, {})).toBe(null);
        });
    });

    describe('getDependencies()', () => {
        it('should accurately detect string dependencies', () => {
            const allFields = ['A', 'B', 'C', 'Distance', 'Time'];
            const deps = getDependencies('Distance / Time + A', allFields);
            expect(deps).toContain('Distance');
            expect(deps).toContain('Time');
            expect(deps).toContain('A');
            expect(deps).not.toContain('B');
            expect(deps).not.toContain('C');
        });
    });
});
