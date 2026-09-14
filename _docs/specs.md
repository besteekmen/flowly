# Flowly — Product Specification

## 1. Product Summary

**Flowly** is a clean, friendly mini Kanban app for individual users.

Each user gets one private board in v1, with fixed workflow columns:

- To Do
- In Progress
- Done

The product should feel lightweight, calm, and easy to understand.

**Brand line:**  
> Keep your work in flow.

---

## 2. Goals

Flowly should let users:

- Sign up and log in securely.
- Manage a private Kanban board.
- Create, edit, delete, move, and reorder tasks.
- Track priority and due dates.
- Filter and temporarily sort tasks.
- See useful board-level counts.
- Manage a basic profile.
- Use the app comfortably on desktop and mobile.

This is a focused v1, not a collaboration or team-management product.

---

## 3. Users & Access

### Authentication

Support:

- Email + password signup/login.
- Google sign-in.
- Forgot-password email reset.
- Password changes for email/password accounts only.
- No email verification in v1.

After first signup, users go directly to their empty board.

### Account

Users can:

- View/edit name.
- View email.
- Set/change avatar.
- Delete their account.

Account deletion requires confirmation and permanently deletes:

- User account
- Board data
- Tasks

No admin functionality in v1.

---

## 4. Board

### v1 Behavior

- One board per user in the UI.
- Data model should support multiple boards later.
- Default board name: **My Board**.
- Board name is editable inline.
- Columns are fixed and cannot be renamed, reordered, added, or deleted.

### Columns

1. To Do
2. In Progress
3. Done

### Board Summary

Show counts for:

- Total
- To Do
- In Progress
- Done
- Overdue

---

## 5. Tasks

### Task Fields

Each task has:

- Title
- Description
- Due date
- Priority
- Status/column
- Position/order
- Created timestamp
- Updated timestamp

Timestamps are stored but not shown in the v1 UI.

### Priority

Allowed values:

- Low
- Medium
- High

### Due Date

- Date only.
- No time component.

### Description

- Plain text only.
- Cards show a 1–2 line preview.
- Full description is visible in the task modal.

### Task Actions

Users can:

- Create
- Edit
- Delete

No archive, labels/tags, duplicate action, or separate completion action.

Tasks remain in **Done** until deleted.

### Create/Edit

- Use one shared modal for both create and edit.
- Edit mode is pre-filled with task data.

### Delete

- Requires a confirmation dialog.

---

## 6. Kanban Interaction

### Desktop

Users can drag and drop tasks to:

- Move between columns.
- Reorder within the same column.

Task order must persist after refresh.

### Mobile

- Board is responsive.
- Do not rely on touch drag-and-drop.
- Use simple move controls for changing task status.
- Reordering on mobile is optional for v1; saved desktop order remains authoritative.

---

## 7. Filtering & Sorting

### Filters

Filters apply across the whole board.

Users can combine filters.

Support:

- Priority: Low / Medium / High
- Due date presets:
  - Overdue
  - Today
  - This Week
  - No Due Date

Overdue tasks should also be visually highlighted.

### Sorting

Users can temporarily sort visible tasks by:

- Due date
- Priority

Sorting does not overwrite the saved manual Kanban order.

### Persistence

Remember active filters and temporary sort settings in local storage per device.

---

## 8. Empty & Edge States

### New User / Empty Board

Show a friendly empty state with:

> Nothing here yet.  
> Create your first task and get things moving.

CTA:

**Create task**

### No Filter Results

Show:

> Nothing matches this view.

### Overdue

Use a subtle visual warning.

Suggested copy:

> This task needs attention.

---

## 9. Profile & Settings

Profile includes:

- Name
- Email
- Avatar

Also include:

- Change password for email/password accounts.
- Delete account.

No advanced preferences page in v1.

Theme follows the user's system setting automatically.

No manual light/dark toggle in v1.

---

## 10. Landing Page

Include a simple public landing page.

### Suggested Copy

**Headline:**  
Keep your work in flow.

**Subheadline:**  
Plan tasks, move them forward, and stay focused on what matters.

**Primary CTA:**  
Start flowing

**Secondary CTA:**  
Log in

No large marketing site or complex onboarding flow.

---

## 11. Responsive Design

Desktop is the primary Kanban experience.

On smaller screens:

- Layout remains fully usable.
- Columns may stack or use horizontal scrolling.
- Task creation/editing stays modal-based.
- Task movement uses explicit controls rather than drag-and-drop.

---

## 12. Visual & Product Tone

Flowly should feel:

- Clean
- Minimal
- Friendly
- Calm
- Lightweight

Avoid a dense enterprise-project-management aesthetic.

Suggested microcopy:

- Keep it flowing.
- One task at a time.
- Small steps, steady progress.
- Move what matters forward.
- Clear board, clear mind.
- Stay in flow.

---

## 13. Data Model Direction

Design the backend around:

- User
- Board
- Task

Relationship:

`User -> Boards -> Tasks`

v1 exposes only one board per user, but the schema should allow multiple boards later.

Each task should store enough information to persist:

- Board ownership
- Column/status
- Manual position
- Priority
- Due date
- Content
- Timestamps

All board/task queries must be scoped to the authenticated user.

---

## 14. v1 Out of Scope

Do **not** include:

- Collaboration
- Shared boards
- Teams
- Comments
- Attachments
- Labels/tags
- Notifications
- Email reminders
- Archive
- Multiple visible boards
- Custom columns
- Search
- Markdown/rich text
- Admin dashboard
- Keyboard shortcuts
- Activity history
- Task duplication
- Recurring tasks
- Subtasks
- Custom date ranges
- Manual theme toggle
- Real-time multi-user updates

---

## 15. Definition of Done

Flowly v1 is complete when a user can:

1. Sign up with email/password or Google.
2. Log in and access only their own board.
3. Rename the board.
4. Create, edit, and delete tasks.
5. Move and reorder tasks on desktop.
6. Move tasks with controls on mobile.
7. See saved task order after refresh.
8. Filter by priority and due-date presets.
9. Temporarily sort by priority or due date.
10. See overdue highlighting and board counts.
11. Edit profile details.
12. Reset/change password where applicable.
13. Delete their account and associated data.
14. Use the app comfortably in system light or dark mode.
