GSTA-84 Wireframes & Interaction Specs

Overview

This document contains low-fidelity wireframes and interaction specifications for the AI Tool Library primary flows: Homepage, Category Page, Tool Detail, Submit Form, and Admin Dashboard. Use this as the canonical handoff for initial frontend implementation and QA.

Notation
- Boxes represent page regions. "[ ]" indicates interactive elements. Small notes follow each wireframe describing expected behaviour.
- Breakpoints: mobile (<=640px), tablet (641–1024px), desktop (>=1025px).

1) Homepage — Desktop

[Header] ----------------------------------------------- [Account]
| Logo | Search [_________] | Create | Notifications | Avatar |

[Hero] Tagline
| Big search input (typeahead) with category chips underneath |

[Main] ----------------------------------+-----------------[Right Rail]
| [Filters column]      | [Results Grid: 3-column cards] | Trending    |
| - Category chips       | [Card] [Card] [Card]           | Curated     |
| - Pricing              | [Card] [Card] [Card]           | Lists       |
| - Model type           | [Load more / Infinite scroll]  | Submit CTA  |

Tool Card (desktop)
- Visual: 72x72 logo, title, 1-line tagline, rating (stars), tags
- Hover: show actions: [Save] [Quick Preview] [Visit]
- Keyboard: card is focusable; Enter opens detail; Space toggles Save

Interactions
- Search: debounced (300ms) suggestions; arrow keys navigate; Enter selects and runs search
- Filters: toggle chips; updating filters updates URL query params and result set without full reload
- Quick Preview: opens inline modal; focus trap; Esc to close

Acceptance Criteria (Homepage)
- Search typeahead appears within 200ms of user typing and returns up to 8 suggestions
- Filters update results client-side and persist in URL
- Tool cards display image, title, tagline, rating, and primary actions

2) Homepage — Mobile

[Header Mobile]
| Logo | Search icon | Avatar |

[Search overlay — full screen]
| Search input with suggestions; category chips horizontally scrollable |

[Results — single column cards]
| Collapsible filters (sticky bottom sheet) |

Mobile specifics
- Card tap opens context menu with [Preview], [Save], [Visit]
- Filters open as modal bottom sheet with Apply/Clear actions


3) Category Page

[Category Header]
| Category title | curator note | Subscribe/Follow button |

[Controls]
| Sort dropdown (Relevance, Trending, Newest, Most Used) | Filter chips |

[Results]
| Grid/List same as homepage but prefiltered |

Deep Linking
- Links to this page include query params for current filters, sort, and page cursor


4) Tool Detail

[Top area]
| Logo (96x96) | Title | Verified badge | Rating | CTA: [Try / Visit] [Save] |

[Metadata row]
| Categories • Tags • Pricing • Model(s) • Last updated |

[Main body]
| Left: Description (markdown) with expandable sections (Overview, Examples, Changelog)
| Screenshots carousel (lightbox) | Example prompts with [Copy] buttons

[Sidebar — desktop]
| Related tools | Author card | Usage stats | Versions |

Quick Preview modal
- Purpose: run a sample prompt in a sandbox (if the tool exposes a demo endpoint)
- Behaviour: focus trap, live region for status updates, cancel button, keyboard accessible

Interactions & Microcopy
- Copy prompt: one-click copy to clipboard, toast: "Prompt copied" (aria-live="polite")
- Visit: opens external link in new tab with rel="noopener" and records click analytics

Acceptance Criteria (Tool Detail)
- Title, logo, tags, and CTA are visible above the fold on desktop
- Copy prompt copies the text and shows accessible confirmation
- Quick Preview runs sample prompt or gracefully degrades if demo unavailable


5) Submit Form — Multi-step

Flow: Basics -> Details -> Media -> Review -> Submit

Step: Basics
- Fields: Tool name*, Short description* (max 150 chars), Categories* (multi-select), Primary URL* (https validated), Tags

Step: Details
- Fields: Long description (markdown), Model(s) used, Pricing (enum), Demo endpoint (optional), Owner contact

Step: Media
- Upload: logo (min 512x512 recommended), screenshots (up to 5). Client-side cropping to square for logo. Preview thumbnails.
- Validation: file size limit (e.g., 5MB), allowed types: png,jpg,svg

Step: Review
- Rendered preview of final tool detail page. Buttons: Edit (go back), Submit

Draft saving
- Auto-save to localStorage every 10s and on step completion. Provide explicit "Save Draft" to server (authenticated users). Drafts listed on user profile.

Validation rules
- Show inline errors with ARIA attributes. Prevent submit if required fields fail validation.
- Detect obvious secret patterns (API keys, tokens) in fields and warn user to remove them.

Acceptance Criteria (Submit Form)
- User can progress through steps, return to edit, and preview final output
- Draft is persisted locally and server-side when authenticated
- On Submit, the tool is created as a draft in moderation queue and user receives submission id and expected moderation time


6) Admin Dashboard — Moderation Queue

[Top Nav] Moderation | Tools | Analytics | Users | Settings

[Moderation Queue]
| Table: [Checkbox] | Tool name | Author | Submitted | Preview | Status | Actions |

Actions per row
- Preview (load trimmed detail), Approve, Request changes (comment dialog), Reject
- Bulk actions: Approve selected, Reject selected, Export selected

Tool Edit / Diff View
- Show side-by-side comparison: Live vs Submitted. Highlight changed fields. Accept/Reject per-field or whole-submission.

Audit & Notifications
- Every moderation action writes to audit log and triggers notification to the author (email/webhook)

Acceptance Criteria (Admin)
- New submissions appear in the queue within 60s of user submission
- Moderators can approve/reject and add comments; actions are logged with timestamp and moderator id
- Bulk actions are available and reversible within 2 minutes (soft undo)


Accessibility & Keyboard Flows
- Typeahead: up/down arrow to traverse, Enter to select, Esc to close. Each suggestion uses role="option" and aria-selected attributes.
- Filter chips: keyboard-focusable, toggle with Enter/Space, aria-pressed reflects state
- Modal: focus trap; initial focus set to first focusable element; Esc closes; return focus to trigger
- Toasts: aria-live="polite" for non-blocking confirmations
- Color contrast: ensure 4.5:1 for body text and 3:1 for large text


Microinteractions
- Card skeleton loaders while fetching
- Hover reveal for card actions on desktop
- Soft animations for modal open/close (<200ms)


Sample API Response (Tool Detail)
{
  "id": "tool_123",
  "name": "SummarizeAI",
  "short_description": "AI summarization tool for long documents",
  "description_markdown": "# Overview\nSummarize long text...",
  "logo_url": "https://cdn.example.com/logos/tool_123.png",
  "screenshots": ["https://.../1.png", "https://.../2.png"],
  "tags": ["summarization", "nlp"],
  "categories": ["Productivity","NLP"],
  "models": ["gpt-4o"],
  "pricing": "freemium",
  "demo_endpoint": "https://api.example.com/demo/tool_123",
  "owner": {"id":"user_56","name":"Alice"},
  "verified": true,
  "rating": 4.6,
  "last_updated": "2026-04-10T12:34:56Z"
}


Handoff Notes for Engineers
- Provide search API contract (typeahead + paginated results). See subtasks/GSTA-84-implementation.md
- Implement a client-side draft save and server-side draft when authenticated
- Ensure images are stored and served via CDN; provide signed upload URLs for direct-to-storage uploads


What I did (task update)
- Added low-fidelity wireframes and interaction specs for homepage, category, tool detail, submit form, and admin dashboard. File: design/wireframes/GSTA-84-wireframes.md
- Next: produce high-fidelity mocks after CTO confirms search backend and image storage approach.
