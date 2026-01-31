# EKAP Editor - Codebase Analysis & Fix Plan

## Executive Summary

Analysis performed using Next.js best practices and 10 parallel explore agents covering:
- App Router Structure
- RSC Boundaries
- Data Fetching Patterns
- Image/Font Optimization
- Configuration & Middleware
- Performance & Bundle Optimization
- TypeScript Type Safety
- Error Handling

---

## Critical Issues (Must Fix)

### 1. Missing 'use client' Directives
**Severity:** HIGH
**Impact:** Runtime errors in production

| File | Line | Issue |
|------|------|-------|
| `src/components/home-view.tsx` | 1 | Uses `useState` but missing directive |
| `src/components/ui/button.tsx` | 1 | Uses `React.forwardRef` |
| `src/components/ui/input.tsx` | 1 | Uses `React.forwardRef` |

**Fix:** Add `'use client';` at line 1 of each file.

---

## High Priority Issues

### 2. Missing Error Boundaries
**Files to create:**
- `src/app/error.tsx` - Page-level error boundary
- `src/app/not-found.tsx` - Custom 404 page

### 3. Performance: Missing Memoization
**File:** `src/components/editor-view.tsx`

| Issue | Lines | Impact |
|-------|-------|--------|
| `filteredItems` not memoized | 399-436 | O(n) filter/sort on every render |
| `grandTotal` not memoized | 438-440 | Decimal.js reduce on every render |
| `totalTableWidth` not memoized | 443 | Calculated on every render |
| Inline onClick handlers | 520, 983-1020 | New functions created each render |

**File:** `src/components/home-view.tsx`

| Issue | Lines | Impact |
|-------|-------|--------|
| `filteredRecent` not memoized | 42-44 | Recalculated on every render |
| `filteredActive` not memoized | 46-48 | Recalculated on every render |
| `formatDate` recreated | 50-57 | New Intl.DateTimeFormat each render |

### 4. Performance: No Code Splitting
**File:** `src/lib/ekap-crypto.ts` (lines 4-6)

Heavy dependencies loaded upfront:
- `crypto-js` (~200KB)
- `jszip` (~85KB)
- `decimal.js` (~85KB)

**Fix:** Use dynamic imports for crypto operations.

### 5. TypeScript: Unsafe `any` Types
**File:** `src/components/editor-view.tsx`

| Lines | Issue |
|-------|-------|
| 75-76 | `measureTextWidth as any` for canvas caching |
| 311, 313 | `item as any` for dynamic property access |
| 920-921 | `onSort: (key: any)` callback parameter |

---

## Medium Priority Issues

### 6. Error Handling Gaps

| File | Lines | Issue |
|------|-------|-------|
| `middleware.ts` | 4-6 | No try-catch for `updateSession()` |
| `utils/supabase/middleware.ts` | 43 | `auth.getUser()` unhandled |
| `ekap-crypto.ts` | 335 | `zip.generateAsync()` no error handling |
| `ekap-crypto.ts` | 48-57 | `parseTurkishNumber` silently returns 0 |

### 7. Environment Variable Validation
**Files:** `src/lib/supabase/*.ts`, `src/utils/supabase/middleware.ts`

All use non-null assertion (`!`) without validation:
```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!
```

**Fix:** Add runtime validation or use a schema library (zod, t3-env).

### 8. Metadata Enhancement
**File:** `src/app/layout.tsx` (lines 18-21)

Current metadata is minimal. Should add:
- `icons` configuration
- `openGraph` metadata
- `viewport` configuration

---

## Low Priority Issues

### 9. Unused Assets
**Directory:** `public/`

Remove unused files:
- `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`
- `test.ekap` (move to test directory)

### 10. Single Global Loading State
**File:** `src/app/page.tsx` (line 87)

One `isLoading` state for multiple operations could conflict.

---

## Implementation Plan

### Phase 1: Critical Fixes
```
1. [ ] Add 'use client' to home-view.tsx, button.tsx, input.tsx
```

### Phase 2: Error Handling & Stability
```
2. [ ] Create src/app/error.tsx
3. [ ] Create src/app/not-found.tsx
4. [ ] Add try-catch to middleware
5. [ ] Add environment variable validation
```

### Phase 3: Performance Optimization
```
6.  [ ] Memoize filteredItems, grandTotal, totalTableWidth
7.  [ ] Memoize formatDate function
8.  [ ] Use useCallback for event handlers
9.  [ ] Dynamic import crypto libraries
```

### Phase 4: TypeScript & Code Quality
```
10. [ ] Fix 'any' types in editor-view.tsx
11. [ ] Add proper typing to SortableHead callbacks
12. [ ] Remove unused public assets
```

### Phase 5: Enhancements
```
13. [ ] Enhance metadata in layout.tsx
14. [ ] Split isLoading into separate states
```

---

## Verification

After implementing fixes:

1. **Build Check:** `npm run build` - should complete without errors
2. **Type Check:** `npx tsc --noEmit` - no TypeScript errors
3. **Lint Check:** `npm run lint` - no ESLint warnings
4. **Runtime Test:**
   - Open app in browser
   - Test file upload/decrypt
   - Test tab switching
   - Test column resize (Büyült/Küçült)
   - Verify no console errors

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/home-view.tsx` | Add 'use client', memoization |
| `src/components/ui/button.tsx` | Add 'use client' |
| `src/components/ui/input.tsx` | Add 'use client' |
| `src/components/editor-view.tsx` | Memoization, TypeScript fixes |
| `src/app/page.tsx` | Split loading state |
| `src/app/layout.tsx` | Enhanced metadata |
| `src/app/error.tsx` | Create new file |
| `src/app/not-found.tsx` | Create new file |
| `src/middleware.ts` | Add error handling |
| `src/utils/supabase/middleware.ts` | Add error handling |

---

## Summary Statistics

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| RSC/Build | 1 | 0 | 0 | 0 |
| Performance | 0 | 2 | 0 | 0 |
| Error Handling | 0 | 1 | 2 | 0 |
| TypeScript | 0 | 1 | 0 | 0 |
| Metadata | 0 | 0 | 1 | 0 |
| Config | 0 | 0 | 0 | 2 |
| **Total** | **1** | **4** | **3** | **2** |
