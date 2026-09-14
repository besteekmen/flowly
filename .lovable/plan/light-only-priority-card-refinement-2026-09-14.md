# Light-only priority card refinement

## Scope
- Remove the unused dark-theme palette so Flowly always renders in light mode.
- Give Low, Medium, and High task cards distinct flat backgrounds that remain calm and harmonious with Flowly teal.
- Adjust card borders, text, metadata, and icon tones for readable contrast.
- Preserve the existing board layout, drag-and-drop, mobile controls, dialogs, routes, and all data behavior.

## Technical details
- Extend the existing semantic color tokens for priority card surfaces, borders, and foregrounds.
- Map each task priority to those semantic styles in the existing task card.
- Verify the frontend and inspect all content-route metadata while keeping it otherwise unchanged.
