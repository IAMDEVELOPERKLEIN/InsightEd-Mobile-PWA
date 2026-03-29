# Implementation Plan - DB Init Syntax Fix

This plan addresses a `SyntaxError` in `api/db_init.js` where backslashes were incorrectly added before template literal characters.

## User Review Required

> [!IMPORTANT]
> This is a critical fix to restore backend functionality. The syntax error currently prevents the server from starting.

## Proposed Changes

### [Component] Backend

#### [MODIFY] [db_init.js](file:///e:/InsightEd-Mobile-PWA/api/db_init.js)
Remove invalid backslashes on lines 479 and 481.

```diff
- console.log(\`✅ [\${dbLabel}] Engineer Documents Table Ready\`);
+ console.log(`✅ [${dbLabel}] Engineer Documents Table Ready`);

- console.error(\`❌ [\${dbLabel}] Failed to migrate engineer_documents:\`, docsErr.message);
+ console.error(`❌ [${dbLabel}] Failed to migrate engineer_documents:`, docsErr.message);
```

## Verification Plan

### Automated Tests
- Run `node -c api/db_init.js` (if possible) or simply restart the server to ensure it compiles correctly.
- Check PM2/server logs for successful startup.

### Manual Verification
- None required beyond ensuring the server starts without `SyntaxError`.
