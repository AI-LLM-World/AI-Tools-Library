title: GSTA-11.3 — Frontend - Search UI
assignee: staff-engineer
priority: high
estimate: 2d
status: todo

Description
-----------
Implement search input with debouncing, filter controls (category, tags, ranges), sort controls, and pagination controls. Ensure accessibility and responsive layout.

Tasks
- Add SearchBar component with accessible label and keyboard behavior
- Add Filters component (category pill list, tag multi-select, range sliders) with clear UX
- Integrate with /api/tools endpoint, debounce input (300ms), and handle loading and empty states
- Add E2E tests (Playwright) for search + filters + pagination

Acceptance Criteria
- UI behaves correctly across breakpoints
- Debounced queries avoid duplicate requests
- E2E tests pass in CI
