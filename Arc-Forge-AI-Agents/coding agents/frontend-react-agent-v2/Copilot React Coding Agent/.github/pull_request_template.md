### Description
When raising a PR, include:
- A brief summary of the change or issue fixed
- Purpose and context of the change
- Any dependencies required for this change

## Type of changes
- [ ] **Bug fix** (non-breaking change fixing a UI/logic issue)
- [ ] **New feature** (non-breaking change adding a component/page)
- [ ] **Refactor** (performance optimization or code cleanup)
- [ ] **Breaking change** (fix or feature that impacts existing props/context/routing)

### Screenshots (if applicable)
Add screenshots for UI or behavior changes.

---

## Checklist

### React & Code Quality
- [ ] **One logical change:** This PR is focused and easy to review.
- [ ] **Clean Code:** Follows project linting/prettier rules; no `console.log` or `debugger`.
- [ ] **Component Architecture:** Logic is properly abstracted into hooks/utils.
- [ ] **TypeScript:** All new components/props are strictly typed; no `any`.

### State & Performance
- [ ] **State Management:** Used the correct level of state (Local vs Global).
- [ ] **Performance:** Checked for unnecessary re-renders; used `memo`/`useCallback` where appropriate.
- [ ] **API Interaction:** Loading and error states are handled (e.g., via React Query/SWR).

### Styling & Design
- [ ] **Responsive Design:** Tested on different browsers.
- [ ] **Design System:** Uses global theme variables/tokens (colors, spacing, typography).
- [ ] **Browser Compatibility:** Verified on Chrome, Safari.

### Accessibility (a11y)
- [ ] **Semantic HTML:** Used correct tags (e.g., `<button>` for actions, not `<div>`).
- [ ] **Keyboard Nav:** Component is navigable via `Tab` and `Enter`.
- [ ] **Screen Readers:** Added necessary `aria-` attributes and alt text for images.

### Testing & Validation
- [ ] **Unit/Integration Tests:** Added/updated tests to have 80% or more coverage (vitest/zustang).
- [ ] **Edge Cases:** Handled empty states, long text, and network failures.

---

## Notes for Reviewers