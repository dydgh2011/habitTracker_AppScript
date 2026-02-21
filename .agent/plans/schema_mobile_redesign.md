# Implementation Plan - Redesign Schema Editor for Mobile

The current Schema Editor uses a grid layout that collapses poorly on mobile, stacking header labels at the top and leaving inputs without context. I will redesign it to use a "card-based" layout on mobile.

## Proposed Changes

### 1. `js/schema/schema-editor.js`
- Add `schema-field-header` class to the column header row to allow hiding it on mobile.
- Wrap each input/select in a wrapper with a mobile-only label, OR add labels directly into the row with a `mobile-label` class. I'll go with the latter for simplicity and flexibility.
- Ensure the "Add Field" button is clearly separated and full-width on mobile.

### 2. `css/components.css`
- **Global Schema styles**: Refine the visual style of `.schema-section` and `.schema-field-row`.
- **Desktop**: Keep the grid layout but improve the header styling (remove inline styles from JS where possible, or override them).
- **Mobile (max-width: 768px)**:
    - Hide the `.schema-field-header`.
    - Set `.schema-field-row` to a single column stack with more padding and a "card" look (borders or different background).
    - Show `.mobile-label` elements.
    - Adjust grid-template-columns for the schedule row.
    - Make buttons more thumb-friendly.

## Side-Effect Analysis
- **Desktop**: Layout Should remain largely the same but look slightly more polished due to CSS resets of inline styles.
- **Mobile**: Significant improvement in usability.

## Verification Plan
1. Render the application.
2. Go to Schema Editor.
3. Check Desktop View.
4. Check Mobile View (480px and 320px).
5. Verify that adding/removing sections/fields still works correctly.
