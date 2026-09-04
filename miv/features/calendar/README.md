# Calendar & Events

## Purpose

The Calendar feature gives the venture team one place to review scheduled events, meetings, calls, due-diligence sessions, presentations and deadlines. It provides summary metrics, event distributions, API-backed filters, focused category tabs and a six-week month view. The dashboard route is deliberately thin and delegates the feature to this folder.

## Structure

```text
app/dashboard/(g5-platform-operations)/calendar/page.tsx  Route entry
features/calendar/
├── api/calendar-api.ts                 Calendar endpoint client
├── components/
│   ├── calendar-page-content.tsx       State composition and tab layout
│   ├── calendar-header.tsx             Page heading and primary action
│   ├── calendar-filters.tsx            Search and API filter controls
│   ├── calendar-stats.tsx              Summary cards
│   ├── calendar-distributions.tsx      Type, priority and status summaries
│   ├── calendar-event-list.tsx         Shared list and empty result state
│   ├── calendar-event-card.tsx         Event details and badges
│   ├── calendar-month-view.tsx         Responsive 42-day month grid
│   ├── calendar-loading-state.tsx      Initial and filter loading state
│   └── calendar-error-state.tsx        Error message and Retry action
├── hooks/
│   ├── use-calendar-data.ts            Fetch lifecycle and request cancellation
│   └── use-calendar-filters.ts         Filter state and setters
├── lib/
│   ├── calendar-date-utils.ts          Month grid, labels and date grouping
│   ├── calendar-display-utils.tsx      Labels, icons and badges
│   └── calendar-event-filters.ts       Meetings and Deadlines tab categories
├── types/calendar.ts                   Shared event, analytics and filter types
└── index.ts                            Public feature export
```

The automated coverage is in `tests/calendar.test.ts`.

## Data flow

1. The dashboard route renders `CalendarPageContent` through the feature's public export.
2. `useCalendarFilters` owns the search, type, priority, status and time-view selections.
3. `useCalendarData` passes those selections to `getCalendarEvents`. Search input is debounced by 300 ms; superseded requests are cancelled with `AbortController`.
4. `calendar-api.ts` converts active filters to query parameters and requests `/api/calendar/events`. It rejects unsuccessful or malformed event-list responses so the page can show its error and Retry state.
5. Analytics are requested from `/api/calendar/analytics?period=30` once per mounted page. An analytics failure is logged but does not hide usable event data; cards and distributions use event-derived fallbacks.
6. The page passes API-filtered events into the shared list and month components. Meetings and Deadlines apply small local category filters to the same result set.

The Calendar feature does not alter API records. Its New Event and event action buttons retain the existing presentation and behaviour.

## Hooks

### `useCalendarFilters`

Starts with an `upcoming` view and `all` for type, priority and status. Setters update one field while preserving the others. Search text is retained as entered for the controlled input and trimmed at the API boundary.

### `useCalendarData`

Returns `{ events, analytics, loading, error, retry }`. It reloads when filters change, debounces non-empty searches, cancels stale work on cleanup and suppresses abort errors. `retry` repeats the current filtered request. Analytics are optional so an analytics outage does not replace event content with an error.

## Filters and categories

- **Search:** sent as trimmed text; the API searches event fields.
- **Event type:** meeting, call, board meeting, due diligence, presentation, deadline or other.
- **Priority:** high, medium or low.
- **Status:** scheduled, in progress, completed or cancelled.
- **View:** all, upcoming or past.
- **Meetings tab:** meeting, call, board meeting and due diligence events from the current API result.
- **Deadlines tab:** deadline events from the current API result.

Filters combine in one request. Selecting `all` omits that query parameter. The request limit remains 100 events.

## Utilities and types

`calendar-date-utils.ts` creates a fixed 42-cell, Sunday-first month grid and provides stable `yyyy-MM-dd` keys. Events are grouped by their date-only `startDate`; invalid or timestamp-formatted values are skipped, and multi-day events appear on their start date only.

`calendar-event-filters.ts` contains the category rules used by the Meetings and Deadlines tabs. Keep category changes here so they remain independently testable.

`calendar-display-utils.tsx` centralises event labels, icons and theme classes. `types/calendar.ts` is the shared contract for event types, priorities, statuses, filter state, analytics and API responses. Update the type constants and their UI/API handling together when adding a supported value.

## States handled

- **Loading:** a centred progress indicator appears for initial and filtered event requests.
- **Success:** summary, distribution, event list and month views render from API data.
- **Empty:** Events, Meetings and Deadlines show a clear, context-specific empty message. The month view renders an empty calendar grid.
- **Error:** HTTP, network, invalid JSON and malformed event-list responses use the shared error state.
- **Retry:** Retry repeats the current filter request without resetting user selections.
- **Partial analytics failure:** events remain visible and summary components use local fallbacks.
- **Cancelled/stale request:** abort errors are ignored during cleanup or a superseding filter request.

## Tests

From `miv/`, run the focused Calendar suite:

```bash
./node_modules/.bin/tsx --test tests/calendar.test.ts
```

Run the frontend repository checks with:

```bash
./node_modules/.bin/tsx --test tests/*.test.ts
npm run lint -- features/calendar tests/calendar.test.ts 'app/dashboard/(g5-platform-operations)/calendar/page.tsx'
npm run typecheck
npm run build
```

The optional integration suite requires a running application plus `MIV_RUN_INTEGRATION_TESTS=true` and `MIV_TEST_BASE_URL`; it is separate from the deterministic Calendar unit tests.

## Maintenance notes

- Keep the route entry thin and expose page-level UI through `features/calendar/index.ts`.
- Keep fetch lifecycle logic in `use-calendar-data.ts` and URL/response handling in `calendar-api.ts`.
- Preserve the existing API parameter names when changing controls.
- Use date-only strings (`yyyy-MM-dd`) for calendar grouping to avoid timezone shifts.
- Add or update tests for every filter/category value and date-boundary change.
- Retain explicit loading, empty, error and retry states when refactoring components.
- Check the 320 px layout and desktop layout after changing cards, filters, tabs or the month grid.
- Do not make analytics availability a requirement for rendering event data.
