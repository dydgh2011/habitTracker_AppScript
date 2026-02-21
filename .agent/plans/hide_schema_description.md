# Implementation Plan - Hide Schema Description on Mobile

The goal is to hide the descriptive paragraph in the Schema Editor view when the application is displayed on mobile viewports.

## Proposed Changes

### 1. `js/views/schema-view.js`
- Add a class `page-description` to the `<p>` element that contains the text "Define the sections, fields, and goals...".
- (Optional but recommended) Move the inline styles to the CSS file for better separation of concerns, or just keep them if minimal change is preferred. To hide it properly via CSS, having a class is essential.

### 2. `css/components.css`
- Add a style for `.page-description` if I move the styles.
- Add a media query entry for `.page-description` inside the existing mobile media queries (`max-width: 768px` or `max-width: 480px`) with `display: none;`.

## Side-Effect Analysis
- **Desktop**: The text remains visible.
- **Mobile**: The text is hidden, saving vertical space which is valuable on smaller screens.
- **Other Pages**: If I reuse the `page-description` class in other views later, they will also be hidden on mobile, which is generally a good pattern for minor descriptive text.

## Verification Plan
1. Render the application in the built-in browser.
2. Navigate to the Schema view.
3. Verify the description is visible on desktop.
4. Resize to mobile width and verify the description disappears.
