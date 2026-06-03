# JWPlayer Adaptive Tone Stabilization

**Date:** 2026-06-03  
**Scope:** `src/components/new-jwplayer.tsx` (adaptive tone sampling logic, lines ~919–1048)  
**Status:** Approved

---

## 1. Overview

Stabilize the adaptive tone feature in the custom JWPlayer controls so that the UI no longer appears "loạn" (chaotic) when video frames change. The controls should still automatically pick white or dark icons for readability, but changes must be smooth, unified across the entire HUD, and resistant to noise.

## 2. Problem Statement

The current implementation suffers from three issues:

1. **Noisy sampling** — a small 160×90 canvas produces erratic luminance readings.
2. **No hysteresis** — a single hard threshold (`luminance < 148`) causes rapid flip-flopping when the video hovers near the midpoint.
3. **Independent left/right clusters** — the left and right sides of the bottom HUD can end up with different tones, creating a visually broken control bar.
4. **Over-sampling frequency** — checks run every 320 ms while controls are visible, amplifying all of the above.

## 3. Proposed Solution

### 3.1 Increase canvas resolution
- Change canvas size from `160×90` to `320×180` for cleaner per-pixel luminance data.

### 3.2 Unify to a single HUD tone
- Remove per-cluster (`left` / `right`) tone calculation.
- Compute one average luminance across the entire bottom-HUD area of the video frame.
- Apply the resulting tone to **all** desktop controls simultaneously.

### 3.3 Schmitt-trigger hysteresis
Replace the single threshold with a dual-threshold gate:

| Current tone | Switch to new tone only if luminance … |
|--------------|----------------------------------------|
| `dark`       | rises above **165**                    |
| `light`      | falls below **135**                    |

This 30-point dead zone prevents oscillation.

### 3.4 Settled timer
- A proposed tone must be consistently recommended for **800 ms** before it is applied to the DOM.
- Use a `pendingTone` ref + timestamp ref to track this without extra re-renders.

### 3.5 Reduce sampling frequency
- **Controls visible:** 1000 ms (was 320 ms).
- **Controls hidden:** 2000 ms (was 720 ms), or skip sampling entirely when the HUD is not rendered.

## 4. Implementation Details

**File:** `src/components/new-jwplayer.tsx`

**Area to modify:** the `sampleControlThemes` effect and its helpers (lines ~919–1048).

**Key code changes:**
- Update `canvas.width` / `canvas.height` to `320` / `180`.
- Delete `clusterSamples` aggregation; compute a single average luminance from the HUD rectangle.
- Introduce `resolveToneWithHysteresis(currentTone, luminance)` helper.
- Introduce `pendingToneRef` and `pendingSinceRef` to implement the settled timer.
- Update `intervalMs` values.

**No new dependencies** are required.

## 5. Testing Criteria

- [ ] Play a video with rapidly changing light/dark scenes (e.g., action anime with flash cuts). Controls must not flip tone more than once every ~2 seconds.
- [ ] The entire bottom HUD must always share the same tone; left and right never diverge.
- [ ] On a mostly-dark video, controls stay in `dark` mode (white icons) without flicker.
- [ ] On a mostly-bright video, controls switch to `light` mode (black icons) and remain stable.
- [ ] CPU usage from `drawImage` + `getImageData` should drop measurably in DevTools Performance tab due to lower frequency + smaller HUD sample area.
