# Chat–Feed–Tasks–Artifacts UX Design

## Context

The current Paperclip UI has Chat (BoardChat), Inbox, and Artifacts as separate pages with weak connections between them. When a user chats with the concierge and kicks off work, there's no way to watch it unfold, see tasks get created, or review artifacts without manually navigating between pages. This design defines the tight feedback loop between these surfaces.

## Design Decisions

### Navigation Structure

**Existing nav items (Dashboard, Routines, Goals, Agents, etc.) remain unchanged.** The following items are added or refined within the existing nav:

| Surface | Nav status | Purpose | Badges? |
|---------|-----------|---------|---------|
| **Chat** | Existing (BoardChat) | Conversation + real-time activity feed | No |
| **Inbox** | Existing — refined | Items needing user action (`in_review`, `blocked`, `failed`, new hires, etc.) | Yes |
| **Tasks** | New nav entry (or promoted from within Inbox) | Full task tracker — all tasks, all statuses | No |
| **Artifacts** | Existing — enhanced | Library of all work products, organized by type/project/agent | Yes — when new artifact lands |

Inbox and Tasks are separate nav items. Inbox is not just a filtered view of Tasks — it also includes non-task items like new hire approvals. The rest of the navigation (Dashboard, Routines, Goals, Agents, etc.) is unaffected.

### Layout by Screen Size

**Desktop:**
- Chat page = split pane (chat left, feed right, draggable divider)
- All other pages = full content area

**Mobile:**
- Chat page = full-screen chat. Feed accessible via pull-up drawer or toggle icon.
- All other pages = full-screen with standard navigation

**Feed is never its own nav destination.** It's always part of the Chat experience, rendered differently per screen size.

### The Feedback Loop: Chat → Feed → Destinations

#### 1. Chat message triggers work (chat → feed)
User says "build me a landing page." Agent responds conversationally in chat with an **inline text link** to the created task (not a card/embed — keeps chat lightweight and avoids competing with the feed).

Simultaneously, a **card appears in the feed** showing the task was created.

#### 2. Feed shows real-time activity (stream)
The feed shows all activity with items linking out to their permanent homes:

- "Task created: Landing Page" → links to task detail page
- "Agent X picked up the task" → links to task detail page  
- "Agent X is writing index.html..." → links to task detail page
- "Agent X submitted landing-page.html for review" → links to artifact URL
- "Task moved to In Review" → links to task detail page

**Feed item format varies by type:**
- Status changes = one-liners (icon + text + timestamp + link)
- Artifact submissions = small cards with a one-line preview

**Feed is flat chronological by default**, filterable/groupable (e.g. by task) when multiple concurrent tasks are running.

**Feed persistence:** Persistent but session-weighted. Recent activity is immediately visible. Older items load on scroll (similar to Cursor's conversation history pattern).

#### 3. Clicking through goes to permanent homes
- Task links → Task detail page (own URL within Tasks UI)
- Artifact links → Artifact's permanent page (own URL within Artifacts UI)

Artifacts have dual presence: attached to the specific task that produced them AND browsable independently in the Artifacts library.

#### 4. Notifications ripple outward
When something needs attention, notifications appear in multiple layers — the closer you are, the more detail:

| Layer | What appears |
|-------|-------------|
| **Chat thread** | Agent posts a message: "Landing page draft is ready for review → [View]" |
| **Feed card** | Card updates with review-needed status |
| **Left nav / bottom tabs** | Badge on Inbox (if task needs action) and/or Artifacts (if new artifact) |

### Badging Rules

| Event | Inbox badge? | Artifacts badge? |
|-------|-------------|-----------------|
| Task moved to `in_review` | Yes | No |
| Task `blocked` | Yes | No |
| Task `failed` | Yes | No |
| Task moved to `in_progress` | No | No |
| Task completed (after approval) | No | Only if artifact was produced |
| New artifact ready | No | Yes |
| New hire approval needed | Yes | No |

### Artifacts Page

Organized independently — by type, project, agent — not just a flat list. This makes it useful even when you don't know which task produced something. It serves as a **library** of everything ever produced.

### Task Detail Page

**URL:** `/:companyPrefix/issues/:issueId` (existing)

**Existing file:** `ui/src/pages/IssueDetail.tsx` (1695 lines) — already has comments, activity, documents, live run widget, sub-issues tabs. Needs reshaping, not rebuilding.

#### Layout

**Top: Status banner**
- When agent is actively working: prominent live status — "Agent X is working: writing index.html..." with pulsing indicator (existing `LiveRunWidget`, made more prominent)
- When task is `in_review`: sticky approval banner — "This task is ready for review → [Approve] [Request Changes]"
- Otherwise: standard status chip + metadata (assignee, priority, created date)

**Below banner: Tabs**
- **Comments** (default tab) — conversation thread with run associations
- **Artifacts** (shown only if artifacts exist) — artifact cards with individual approval actions
- **Sub-issues** — unchanged from current implementation
- **Activity** — execution history, status changes, cost summary

#### Approval Model

Two levels of approval: **artifact-level** and **task-level**.

**Artifact-level (on Work Products tab):**
- Each artifact card has Approve / Request Changes actions
- Approving marks that specific output as good
- Requesting changes notifies the agent to rework that artifact

**Task-level (sticky banner at top):**
- "Approve task" = this work is done, close it out
- "Request changes" = send back for more work

**Approval rules and safeguards:**
- **Approve task with unapproved artifacts:** Confirmation dialog — "2 artifacts haven't been individually reviewed. Approving the task will auto-approve them. Continue?"
- **Approve task with `changes_requested` artifacts:** Blocked or warned — "You've requested changes on styles.css. Resolve or dismiss that before approving the task."
- **Approve all artifacts individually:** Task stays `in_review` until user explicitly approves at the task level (approving artifacts doesn't auto-close the task)

---

## Open Questions for Implementation

- Exact pull-up drawer / toggle UX for mobile feed
- Feed grouping/filtering UI when multiple tasks are concurrent
- Whether the feed should have a small unread activity indicator on the chat page (e.g. a dot on the feed toggle on mobile)
- Work Products tab: card layout, what metadata to show per artifact type (PR vs. preview URL vs. document)

## Files Likely Affected

- `ui/src/pages/BoardChat.tsx` — split pane, feed integration, inline links in chat
- `ui/src/pages/IssueDetail.tsx` — status banner, approval UX, work products tab
- `ui/src/pages/Inbox.tsx` — filter to action-needed items only
- `ui/src/pages/Artifacts.tsx` — organization by type/project/agent
- `ui/src/components/ArtifactsPanel.tsx` — may evolve into the feed component
- `ui/src/components/LiveRunWidget.tsx` — make more prominent as status banner
- `ui/src/components/IssueDocumentsSection.tsx` — may merge with work products tab
- `ui/src/components/` — new components for feed items, badges, mobile drawer, approval dialogs
- `ui/src/api/issues.ts` — feed data sourcing, approval endpoints
- Navigation/layout components — badge logic, responsive layout switching

## Verification

- Desktop: Chat with concierge → trigger task → verify feed card appears → click through to task detail → verify live status banner → verify work products tab shows artifacts → approve artifact individually → approve task (verify confirmation when unapproved artifacts remain) → verify task moves to done → verify artifact badges on nav
- Mobile: Same flow, verify feed accessible via drawer/toggle, verify bottom tab badges
- Approval edge cases: try approving task with changes-requested artifact (should warn), try approving task with all artifacts approved (no warning), approve task with unapproved artifacts (confirmation dialog)
- Badge rules: Verify each event in the badging rules table produces correct badge behavior
