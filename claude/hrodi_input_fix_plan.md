# Implementation Plan - Fix HRODI Dashboard Input Focus Loss

The HRODI dashboard (`EFDHome.jsx`) currently updates its main `searchQuery` state on every keystroke. This triggers immediate re-renders and network requests (fetching summaries and project lists), which can cause the input field to lose focus or the mobile keyboard to hide due to heavy DOM updates and potential layout shifts during rapid typing.

## Proposed Changes

### [HRODI Dashboard Component] - [EFDHome.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/EFDHome.jsx)

Introduce a local state for the search input and a debounce effect to update the shared `searchQuery` state only after the user pauses typing.

#### [MODIFY] [EFDHome.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/EFDHome.jsx)

1.  **Initialize local state:**
    ```javascript
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    ```
2.  **Add debounce effect:**
    ```javascript
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearchQuery !== searchQuery) {
                setSearchQuery(localSearchQuery);
            }
        }, 400); // 400ms delay is usually optimal for mobile
        return () => clearTimeout(timer);
    }, [localSearchQuery, searchQuery]);
    ```
3.  **Update input binding:**
    Update the search input at line 756 to use `localSearchQuery` and `setLocalSearchQuery`.
4.  **Sync local state on external change:**
    Add an effect to update `localSearchQuery` if `searchQuery` is reset (e.g., by "Clear Filters").

## Verification Plan

### Manual Verification
1.  **Mobile Interaction Test:**
    - Open the HRODI Dashboard (`/efd-dashboard`) using Chrome DevTools in Mobile Emulation mode.
    - Type rapidly in the search input.
    - **Expected Outcome:** The keyboard remains visible, and the input text updates smoothly without lag or focus loss.
2.  **Search Functionality Test:**
    - Type a search term and wait 0.5s.
    - **Expected Outcome:** The project list and summary cards update to reflect the search result after the pause.
3.  **Network Traffic Test:**
    - Monitor the Network tab while typing.
    - **Expected Outcome:** API calls to `/api/dashboard/efd-summary` and `/api/projects` should only occur once per search session (after the user stops typing), rather than on every keystroke.
