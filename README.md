# Flowly Frontend Demo

Implement the frontend for the app described in specs.md.

Put all frontend code in:

frontend/

Do not implement the real backend yet.

Requirements:

Build the app as a polished, responsive frontend matching the product spec.

Implement the main user flows and interactions from the spec.

Use mock data for now.

Centralize all backend-facing logic in one place, such as:

frontend/src/services/

or frontend/src/api/

UI components must not call mock data directly.

Expose backend operations through a small service/API layer so the mocks can later be replaced with real HTTP calls without rewriting the UI.

Simulate async behavior in the mock API where useful.

Keep types/interfaces for API data separate from UI components.

Persist mock board/task state locally so refreshes do not reset the demo experience.

Persist filters and temporary sorting according to the spec.

Implement system light/dark theme support.

Make desktop drag-and-drop functional.

On mobile, use explicit task move controls instead of relying on drag-and-drop.

Make all main UI states usable:

landing page

login

signup

forgot password

board

empty board

create task

edit task

delete confirmation

filters

sorting

overdue state

profile/settings

account deletion confirmation

Authentication is mocked for now.

Google sign-in should be represented in the UI but should not connect to Google yet.

Do not add features that are explicitly out of scope in _docs/specs.md.

Do not implement backend infrastructure, database code, server routes, or real authentication.

Keep the implementation simple and easy to replace with a real backend later.

Design direction:

Clean

Minimal

Friendly

Calm

Lightweight

Avoid an enterprise project-management look.

Use the Flowly branding and copy from the spec where appropriate.

Before making implementation decisions, read _docs/specs.md fully and treat it as the source of truth.

If the spec leaves a minor UI detail unspecified, choose the simplest option that fits the existing product direction rather than adding new functionality.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f0d7cabb-3649-46f3-8e8e-2f2056adae92).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
