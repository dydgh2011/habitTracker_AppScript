import { describe, it, expect } from 'vitest';
import {
    getSections,
    getFields,
    getChartGroups,
    validateSchema
} from '../js/schema/schema-manager.js';

describe('Schema Manager Utilities', () => {

    describe('Section & Field Queries', () => {
        const mockSchema = {
            'Daily Goals': { 'A': { type: 'checkbox' } },
            'Fitness': { 'Squat': { type: 'number' } },
            'Monthly Goals': { 'B': { type: 'checkbox' } }
        };

        it('should return sections in correct order (Goals padding custom)', () => {
            const sections = getSections(mockSchema);
            expect(sections).toEqual(['Daily Goals', 'Fitness', 'Monthly Goals']);
        });

        it('should map fields to array with names injected', () => {
            const fields = getFields(mockSchema, 'Fitness');
            expect(fields).toHaveLength(1);
            expect(fields[0].name).toBe('Squat');
            expect(fields[0].type).toBe('number');
        });
    });

    describe('getChartGroups()', () => {
        it('should appropriately group fields sharing chartGroup identifiers', () => {
            const mockSchema = {
                'Fitness': {
                    'Pushups': { type: 'number', chartGroup: 'Upper Body', chartType: 'bar' },
                    'Pullups': { type: 'number', chartGroup: 'Upper Body' },
                    'Squats': { type: 'number' } // Ungrouped
                },
                'Misc': {
                    'Notes': { type: 'text' } // Should be ignored
                }
            };

            const groups = getChartGroups(mockSchema);

            expect(groups.has('Upper Body')).toBe(true);
            const upperBody = groups.get('Upper Body');
            expect(upperBody.chartType).toBe('bar');
            expect(upperBody.fields).toHaveLength(2);

            // Ungrouped fields get an auto-generated unique identifier
            const ungroupedKeys = Array.from(groups.keys()).filter(k => k.startsWith('_ungrouped_'));
            expect(ungroupedKeys).toHaveLength(1);
            expect(groups.get(ungroupedKeys[0]).fields[0].name).toBe('Squats');

            // Text fields should be explicitly completely ignored
            const allFieldNames = Array.from(groups.values()).flatMap(g => g.fields.map(f => f.name));
            expect(allFieldNames).not.toContain('Notes');
        });
    });

    describe('validateSchema()', () => {
        it('should return valid true for a correct schema', () => {
            const valid = {
                'Fitness': {
                    'Squat': { type: 'number', schedule: { type: 'everyday' } },
                    'Pace': { type: 'velocity', calculation: '10 / 2' }
                }
            };
            const result = validateSchema(valid);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should catch invalid overall structure', () => {
            expect(validateSchema(null).valid).toBe(false);
            expect(validateSchema("string").valid).toBe(false);
        });

        it('should catch missing or invalid types', () => {
            const badType = { 'A': { 'Field1': { type: 'magic' } } };
            const badMissing = { 'A': { 'Field1': {} } };

            expect(validateSchema(badType).valid).toBe(false);
            expect(validateSchema(badMissing).valid).toBe(false);
        });

        it('should enforce calculations on velocity fields', () => {
            const badVelocity = { 'A': { 'Speed': { type: 'velocity' } } }; // missing calculation
            const result = validateSchema(badVelocity);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toMatch(/missing a "calculation" property/);
        });

        it('should catch invalid schedules', () => {
            const badWeekdays = { 'A': { 'F': { type: 'number', schedule: { type: 'weekdays', days: [8] } } } }; // 8 is not a valid day index
            const badDates = { 'A': { 'F': { type: 'number', schedule: { type: 'dates', dates: ['bad-date'] } } } };

            expect(validateSchema(badWeekdays).valid).toBe(false);
            expect(validateSchema(badDates).valid).toBe(false);
        });
    });

});
