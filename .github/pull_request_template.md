## Summary
- 

## Validation
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Relevant tests updated and passing

## Mobile Design Gates
- [ ] Touch targets respect `MIN_TOUCH_TARGET` (44) on all new/changed controls
- [ ] Interactive controls include `accessibilityRole` and `accessibilityLabel`
- [ ] Tabs use `tablist/tab` semantics with selected state
- [ ] Large vertical datasets are virtualized (`FlatList`/`FlashList`)
- [ ] Offline-with-cache and offline-no-cache states are handled explicitly

## Mobile Security Gates
- [ ] No direct `fetch(` in `src/data/**` outside approved secure transport module
- [ ] Mock mobile attestation is disabled outside dev/test environments
- [ ] Release signing credentials and expected release signature hash are configured
