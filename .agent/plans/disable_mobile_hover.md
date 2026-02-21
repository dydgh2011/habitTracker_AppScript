# Implementation Plan - Disable Mobile Hover for Month Nav Buttons

The goal is to prevent the hover styles of `.month-nav-btn` from being applied on mobile devices to avoid "sticky hover" behavior on touch screens.

## Proposed Changes

### 1. `css/components.css`
- Wrap the existing `.month-nav-btn:hover` styles in a `@media (hover: hover)` media query.
- This ensures the hover effects only trigger on devices with a proper hover state (like desktops with mice).
- **Alternative**: Add overrides in the `@media (max-width: 768px)` block. I will use the `@media (hover: hover)` approach as it is the industry standard for this specific issue, but I will ensure it aligns with the "mobile layout" mentioned by the user.

## Side-Effect Analysis
- **Desktop**: No change. Hover will still work as expected.
- **Mobile/Touch**: Hover styles (background change, transform, box-shadow) will no longer trigger on tap. This improves the UX by preventing the button from looking "stuck" in a hover state after being clicked.
- **Tablets**: Also benefits from this change if they are touch-only.

## Verification Plan
1. Render the application in the built-in browser.
2. Check `.month-nav-btn` hover on "desktop" (standard mouse interaction).
3. Switch to a mobile viewport/touch simulation and verify the hover style is not applied or does not persist.
4. Take screenshots of both layouts.
