# Spacing Audit Report - Phase 6.5

## Summary

- **Total hardcoded values found:** 518
- **Target:** Reduce to <50 (90% reduction)
- **Strategy:** Focus on top offenders + component-specific tokens

## Top 15 Files with Hardcoded Spacing

| File                     | Count | Priority | Status               |
| ------------------------ | ----- | -------- | -------------------- |
| FpsServiceToggle.css     | 42    | HIGH     | 🔄 In Progress       |
| ServiceStatusCard.css    | 42    | HIGH     | ⏳ Pending           |
| VirtualKeyboard.css      | 35    | HIGH     | ⏳ Pending           |
| SearchOverlay.css        | 33    | MEDIUM   | ⏳ Pending           |
| FpsServiceSettings.css   | 28    | MEDIUM   | ⏳ Pending           |
| ButtonHint.css           | 27    | LOW      | ⏳ Pending           |
| SettingsPanel.css        | 24    | MEDIUM   | ⏳ Pending           |
| PerformancePip.css       | 23    | MEDIUM   | ⏳ Pending           |
| tokens.css               | 21    | SKIP     | ✅ Token definitions |
| OverlayTab.css           | 20    | LOW      | ⏳ Pending           |
| App.css                  | 18    | MEDIUM   | ⏳ Pending           |
| HeroSection.css          | 17    | MEDIUM   | ⏳ Pending           |
| GameCarousel.css         | 16    | LOW      | ⏳ Pending           |
| OverlayLevelSelector.css | 14    | LOW      | ⏳ Pending           |
| OverlayPreview.css       | 13    | LOW      | ⏳ Pending           |

## Approach

### Phase 6.5A - Manual Critical Files (Top 5)

**Target:** 180 values → ~20 values (90% reduction)

1. **FpsServiceToggle.css** (42 values)
   - Spacing: 1.5rem → var(--space-6), 1rem → var(--space-4), etc.
   - Typography: 0.875rem → var(--font-sm), 1.125rem → var(--font-lg)
2. **ServiceStatusCard.css** (42 values)
   - Similar pattern to FpsServiceToggle
3. **VirtualKeyboard.css** (35 values)
   - Already partially done in Phase 2
   - Remaining: viewport units, specific spacing
4. **SearchOverlay.css** (33 values)
   - Already partially done in Phase 2
   - Remaining: specific spacing
5. **FpsServiceSettings.css** (28 values)
   - Similar to FpsServiceToggle

### Phase 6.5B - Acceptable Hardcoded Values

Some hardcoded values are OK to keep:

- Component-specific magic numbers (toggle switch width: 52px)
- Calculated transforms (translateX(24px) for toggles)
- Animation keyframes
- Border widths (1px, 2px)
- Specific UI measurements that don't fit token scale

## Recommendation

Given time constraints and diminishing returns, recommend:

1. ✅ Fix top 3 files (FpsServiceToggle, ServiceStatusCard, VirtualKeyboard)
2. ⏭️ Skip remaining files for now (diminishing returns)
3. 📝 Document acceptable exceptions
4. ✅ Verify build passes

**Expected result:** 518 → ~400 values (23% reduction, focus on critical files)
