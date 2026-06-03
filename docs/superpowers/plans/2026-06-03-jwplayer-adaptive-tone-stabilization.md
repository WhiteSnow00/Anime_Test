# JWPlayer Adaptive Tone Stabilization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the adaptive tone feature in `new-jwplayer.tsx` so controls no longer flicker between white/black and the entire HUD maintains a single unified tone.

**Architecture:** Keep the existing canvas-based video-frame sampling but increase resolution, unify left/right clusters into one tone, add Schmitt-trigger hysteresis, enforce an 800 ms settled timer, and reduce sampling frequency. All tone-related helpers and state shapes remain backward-compatible with the existing Tailwind class generators.

**Tech Stack:** React (Next.js), TypeScript, Tailwind CSS, JWPlayer 8

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/new-jwplayer.tsx` | Modify (~lines 919–1048) | Canvas sampling, hysteresis, settled timer, frequency |

---

## Task 1: Refactor Adaptive Tone Sampling Logic

**Files:**
- Modify: `src/components/new-jwplayer.tsx:~919-1048`

---

### Step 1: Increase canvas resolution

Locate the canvas creation inside the `useEffect` that starts around line 919.

Replace:

```typescript
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
```

With:

```typescript
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
```

---

### Step 2: Replace per-cluster sampling with unified HUD sampling

Inside the same effect, locate the `sampleControlThemes` function (around line 987).

Replace the entire body of `sampleControlThemes` (from the `setDesktopControlTones` call onward) with the following unified logic.

```typescript
    const DARK_TO_LIGHT_THRESHOLD = 165;
    const LIGHT_TO_DARK_THRESHOLD = 135;
    const SETTLED_MS = 800;

    const resolveToneWithHysteresis = (
      currentTone: DesktopControlTone,
      luminance: number
    ): DesktopControlTone => {
      if (currentTone === "dark" && luminance > DARK_TO_LIGHT_THRESHOLD)
        return "light";
      if (currentTone === "light" && luminance < LIGHT_TO_DARK_THRESHOLD)
        return "dark";
      return currentTone;
    };

    // Refs for settled timer (survive across intervals)
    const pendingToneRef: { current: DesktopControlTone | null } = { current: null };
    const pendingSinceRef: { current: number } = { current: 0 };

    const sampleControlThemes = () => {
      const video = containerRef.current?.querySelector(
        "video"
      ) as HTMLVideoElement | null;

      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        const videoRect = video.getBoundingClientRect();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        setDesktopControlTones((previous) => {
          const samples: number[] = [];

          (Object.keys(DESKTOP_CONTROL_CLUSTER_MAP) as DesktopControlKey[]).forEach((key) => {
            const element = desktopControlRefs.current[key];
            if (!element || !element.isConnected) return;

            const luminance = sampleLuminanceAtElement(element, videoRect);
            if (luminance != null) samples.push(luminance);
          });

          if (samples.length === 0) return previous;

          const averageLuminance =
            samples.reduce((sum, value) => sum + value, 0) / samples.length;

          // Use left as the unified current tone (left and right are always kept equal)
          const currentTone = previous.left;
          const proposedTone = resolveToneWithHysteresis(currentTone, averageLuminance);

          if (proposedTone === currentTone) {
            pendingToneRef.current = null;
            pendingSinceRef.current = 0;
            return previous;
          }

          const now = Date.now();
          if (pendingToneRef.current !== proposedTone) {
            pendingToneRef.current = proposedTone;
            pendingSinceRef.current = now;
            return previous;
          }

          if (now - pendingSinceRef.current < SETTLED_MS) {
            return previous;
          }

          // Apply unified tone to both clusters
          pendingToneRef.current = null;
          pendingSinceRef.current = 0;
          return { left: proposedTone, right: proposedTone };
        });
      } catch {
        // Ignore sampling failures (e.g. transient cross-origin/decoder states)
      }
    };
```

Also delete the old `resolveToneFromLuminance` helper (the one with the single `< 148` threshold) because it is no longer used.

---

### Step 3: Reduce sampling frequency

Locate the interval setup at the bottom of the same effect (around line 1040).

Replace:

```typescript
    const intervalMs = controlsVisible ? 320 : 720;
```

With:

```typescript
    const intervalMs = controlsVisible ? 1000 : 2000;
```

---

### Step 4: Type-check the project

Run:

```bash
npx tsc --noEmit
```

Expected: no errors in `src/components/new-jwplayer.tsx`.

If there are pre-existing errors in other files, ignore them; only fix errors introduced by the changes above.

---

### Step 5: Commit

```bash
git add src/components/new-jwplayer.tsx
git commit -m "fix(player): stabilize adaptive tone sampling

- Increase canvas resolution 160x90 -> 320x180
- Unify left/right clusters into single HUD tone
- Add Schmitt-trigger hysteresis (135/165 thresholds)
- Add 800ms settled timer before tone flip
- Reduce sampling frequency 320/720ms -> 1000/2000ms

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] 3.1 Increase canvas resolution → Step 1
- [x] 3.2 Unify to single HUD tone → Step 2 (samples aggregated into one array, both clusters set equal)
- [x] 3.3 Schmitt-trigger hysteresis → Step 2 (`resolveToneWithHysteresis` with 135/165)
- [x] 3.4 Settled timer → Step 2 (`SETTLED_MS = 800`, `pendingToneRef`, `pendingSinceRef`)
- [x] 3.5 Reduce sampling frequency → Step 3 (1000/2000 ms)

**Placeholder scan:** No TBD, TODO, or vague instructions remain.

**Type consistency:** `DesktopControlTone`, `DesktopControlKey`, `DESKTOP_CONTROL_CLUSTER_MAP`, and state shape `Record<DesktopControlCluster, DesktopControlTone>` are reused exactly as defined earlier in the file. No new types are introduced.
