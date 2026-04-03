---
name: interactive-ui-ux
description: Builds interactive web UI with motion, feedback, accessibility, and responsive behavior in React. Use when adding animations, hover and focus states, drag-and-drop, dialogs and drawers, form validation feedback, loading and empty states, micro-interactions, gestures, or polishing how the site feels to use.
---

# Interactive UI/UX (web)

## Default stack in this repo

Prefer tools already in the project:

| Concern | Default |
|---------|---------|
| Primitives (dialogs, menus, tabs, tooltips) | Radix UI components in `src/components/ui/` |
| Motion / layout transitions | `framer-motion` |
| Styling / responsive | Tailwind CSS; `tailwind-merge`, `clsx`, `class-variance-authority` |
| Toasts | `sonner` or `react-hot-toast` (match existing usage in the file or route) |
| Drag and drop | `@hello-pangea/dnd` when lists or boards need reordering |
| Command palette | `cmdk` when appropriate |
| Sheets / mobile panels | `vaul` drawer patterns if already used nearby |

If the codebase uses a different pattern in the same feature area, follow local conventions first.

## Principles (short)

1. **Feedback**: Every meaningful action should have visible, timely feedback—hover, active, loading, success, error, disabled. Avoid silent failures.
2. **Affordance**: Interactive elements should look and behave like controls (cursor, focus ring, hit targets ≥ ~44px on touch).
3. **Motion with purpose**: Use motion to orient (layout change), confirm (success), or reduce perceived wait—not decoration only. Prefer `transform` and `opacity`; avoid animating `height`/`top`/`left` on large trees without reason.
4. **Accessibility**: Keyboard path mirrors pointer path; focus management for modals and drawers; ARIA labels where Radix does not already supply them; respect `prefers-reduced-motion` when adding non-subtle animation.
5. **Performance**: Lazy-load heavy visuals; debounce or throttle noisy handlers; keep lists virtualized if very long.

## Implementation checklist

Before finishing a UI change:

- [ ] Loading and error states for async work (disabled submit, skeleton or spinner, retry where useful).
- [ ] Empty states when there is no data (short message + primary action if applicable).
- [ ] Focus visible after open/close of overlays; restore focus when closing dialogs.
- [ ] Works at mobile widths; no horizontal scroll unless intentional.
- [ ] Touch targets usable; no hover-only critical info.

## Patterns (when to use what)

**Micro-interaction (button, toggle, chip)**  
Small transition on color/scale/shadow; keep duration short (often 150–250ms). Use CSS/Tailwind or a light `motion` wrapper—avoid heavy wrappers on every leaf node.

**Page or section enter**  
`framer-motion` with staggered children or a single container variant; cap simultaneous animations.

**Modal / drawer**  
Use Radix dialog or existing `Dialog` / `Sheet` wrappers; trap focus; close on Escape; optional click-outside behavior consistent with existing components.

**Form validation**  
Inline errors near fields; summarize at top for screen readers when Radix `Form` or project pattern supports it; don’t rely on color alone.

**Optimistic UI**  
Update UI immediately only when rollback or refetch on error is straightforward; show undo or toast on failure.

## When the user asks for “more interactive”

1. Identify the primary user goal (complete task, explore, compare).
2. Add the smallest interaction that clarifies state: feedback → motion → richer gestures, in that order.
3. Reuse design tokens, spacing, and components from `src/components/ui/` for visual consistency.

## Additional resources

- For complex dashboards, charts, or exploratory tools, the user may prefer a Cursor Canvas; offer it when a static reply is insufficient.
