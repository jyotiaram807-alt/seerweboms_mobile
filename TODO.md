# Performance Optimization TODO
Optimized React Native app for faster data loading, smoother navigation, and reduced re-renders.

## Plan Priorities (User-approved)
1. **API Caching** (api.ts + cache.ts) - Reduce redundant calls
2. **CartContext Optimization** - Debounce saves, memoize
3. **Screen Memoization** (useMemo/useCallback) - RetailerHome, CartScreen, etc.
4. **List/Component Opts** (FlatList, React.memo)
5. **Loading Skeletons/UI Polish**

## Step-by-Step Tasks
### Phase 1: API Caching [✅]
- [x] Create `src/lib/cache.ts` (simple Map cache with TTL 5min)
- [x] Update `src/lib/services/api.ts`: Add `cachedGet` wrapper for apiGet
- [x] Test: Manual verify no duplicate calls on refresh

### Phase 2: CartContext [✅]
- [x] Update `context/CartContext.tsx`: Debounce AsyncStorage (300ms), memoize actions/count/safeCart
- [x] Add cache invalidation hook (clearCart → invalidate /products)

### Phase 3: Screen Optimizations [✅]
- [x] RetailerHome.tsx: cachedGet, useMemo(filteredProducts/totals), memo FlatList/renderItem, FlatList opts
- [x] CartScreen.tsx: cachedGet, useMemo(cartRows/totals/items)
- [x] RetailerDashboard.tsx: cachedGet, StatCard.memo, deps cleanup
- [x] StaffScreen.tsx: cachedGet + Promise.all → cached, memo lists, abort controller

### Phase 4: Components/Lists [ ]
- [ ] ProductCart.tsx: Read + React.memo if needed
- [ ] Navbar.tsx, BottomTab: memo + useMemo for counts
- [ ] FlatList opts: keyExtractor, initialNumToRender=10, getItemLayout

### Phase 5: UX/Polish [ ]
- [ ] Add skeletons/ActivityIndicator where missing
- [ ] Image opts: resizeMode + cache headers if possible

## Testing
- [ ] Navigation: Time page loads pre/post
- [ ] Data: Verify caching (Network tab)
- [ ] Re-renders: React DevTools Profiler
- [ ] Full app test: No regressions

**Progress: 0/5 phases complete**

