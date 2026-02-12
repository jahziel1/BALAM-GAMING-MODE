# D3DKMT Research and Findings

## Executive Summary

**D3DKMT API does NOT provide the GPU metrics we need.** After implementation research, I discovered that:

- ❌ **No GPU temperature** - Not exposed via D3DKMT
- ❌ **No power draw** - Not exposed via D3DKMT
- ❌ **No real-time GPU usage** - Only provides memory statistics and segment info

## What is D3DKMT Actually Used For?

D3DKMT (DirectX Kernel Mode Thunks) is primarily used for:

- GPU memory management statistics
- Adapter enumeration
- Process memory allocation tracking
- Video memory budgets

**It is NOT used for performance monitoring** (temperature, power, utilization).

## How Does Task Manager Get GPU Usage?

Windows Task Manager uses **Performance Counters** (`PDH` API), not D3DKMT, for GPU metrics:

```
Performance Counter Path:
\GPU Engine(*)\Utilization Percentage
```

Performance Counters provide:

- ✅ Real-time GPU utilization (0-100%)
- ✅ Per-engine breakdowns (3D, Copy, Video Decode, etc.)
- ✅ Works with all vendors (NVIDIA, AMD, Intel)
- ✅ Same data Task Manager shows

Performance Counters do **NOT** provide:

- ❌ Temperature (requires vendor SDKs)
- ❌ Power draw (requires vendor SDKs)
- ❌ Fan speed (requires vendor SDKs)

## Recommended Solution

### Option 1: Performance Counters (PDH API) - RECOMMENDED ✅

**Pros:**

- Universal (all GPU vendors)
- Real-time GPU usage percentage
- Native Windows API
- What Task Manager uses
- Already works (proven)

**Cons:**

- No temperature/power (still need vendor SDKs for that)
- Slightly more complex to query

**Implementation:**

```rust
use windows::Win32::System::Performance::{PdhOpenQueryW, PdhAddCounterW, PdhCollectQueryData, PdhGetFormattedCounterValue};

// Query GPU engine utilization
\\GPU Engine(*engtype_3D)\\Utilization Percentage
```

### Option 2: Keep NVML-only ⚠️

**Pros:**

- Already implemented
- Full metrics (temp, power, usage)
- Reliable

**Cons:**

- NVIDIA-only
- AMD/Intel users get no GPU metrics

### Option 3: Vendor-specific SDKs 🔴

**Pros:**

- Full metrics for each vendor

**Cons:**

- Need 3 separate SDKs (NVML, ADL, IGCL)
- Complex integration
- Large binary size
- Maintenance burden

## Current State

✅ **D3DKMTAdapter implemented** - Compiles successfully but returns `None` for all metrics

- Documents why D3DKMT doesn't work
- Graceful fallback (no crashes)
- Ready for future expansion if needed

## Next Steps - Choose One:

### A. Implement Performance Counters (PDH) ✅ RECOMMENDED

- Add `pdh_adapter.rs` using Windows PDH API
- Query `\GPU Engine(*)\Utilization Percentage`
- Integrate into `WindowsPerfMonitor`
- Provides GPU % for all vendors

### B. Accept NVML-only limitation

- Keep current code as-is
- AMD/Intel users see 0% GPU usage
- Temperature/power still NVIDIA-only

### C. Implement all vendor SDKs

- Add AMD Display Library (ADL)
- Add Intel Graphics Control Library (IGCL)
- Significant complexity increase

## Recommendation

**Implement Option A (Performance Counters)** for GPU usage percentage.

This gives us:

- **GPU usage**: Performance Counters (all vendors) ✅
- **Temperature**: NVML (NVIDIA only) ⚠️
- **Power**: NVML (NVIDIA only) ⚠️

AMD/Intel users get GPU usage percentage (most important metric), while NVIDIA users get full monitoring.

## Files Modified

- ✅ `d3dkmt_adapter.rs` - Documented D3DKMT limitations
- ✅ `mod.rs` - Exported D3DKMTAdapter
- ✅ `Cargo.toml` - Added Win32_Graphics_Direct3D9 feature

## Code Quality

- ✅ Compiles without errors
- ✅ Follows existing patterns (lazy init, Arc<Mutex>, Result<Option<T>>)
- ✅ Thread-safe
- ✅ Documented limitations
- ✅ Tests included
