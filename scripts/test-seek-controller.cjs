// Run with: node --test scripts/test-seek-controller.cjs
// Transpile this dependency-free TS module in memory; no extra test runner needed.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/seek-controller.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, performance, setTimeout, clearTimeout });
const { createSeekController, parseIndependentSegmentStarts, getSegmentPreviewTime } = exportsObject;

function fixture({ fast = false, fallback = false, coarse = false } = {}) {
  let clock = 0;
  let timerId = 0;
  let currentTime = 0;
  const timers = new Map();
  const writes = [];
  const targets = [];
  const settled = [];
  const video = {
    duration: 1440,
    readyState: 4,
    seeking: false,
    get currentTime() { return currentTime; },
    set currentTime(time) { currentTime = time; video.seeking = true; writes.push({ time, kind: "exact" }); },
  };
  if (fast) video.fastSeek = (time) => {
    currentTime = Math.floor(time / 2) * 2;
    video.seeking = true;
    writes.push({ time, kind: "fast" });
  };
  const controller = createSeekController({
    getVideo: () => fallback ? null : video,
    getDuration: () => 1440,
    getPreviewTime: coarse ? (time) => Math.floor(time / 10) * 10 + 0.12 : undefined,
    fallbackSeek: (time) => { currentTime = time; writes.push({ time, kind: "fallback" }); },
    onTargetChange: (time) => targets.push(time),
    onSettled: (time) => settled.push(time),
    now: () => clock,
    setTimer: (callback, delay) => { const id = ++timerId; timers.set(id, { at: clock + delay, callback }); return id; },
    clearTimer: (id) => timers.delete(id),
  });
  const advance = (duration) => {
    const end = clock + duration;
    while (true) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      clock = due[1].at;
      timers.delete(due[0]);
      due[1].callback();
    }
    clock = end;
  };
  const complete = () => { video.seeking = false; controller.complete(); };
  return { controller, video, writes, targets, settled, timers, advance, complete };
}

test("a drag publishes every UI target but keeps only the latest decoder request", () => {
  const f = fixture();
  f.controller.begin();
  for (let i = 1; i <= 100; i++) f.controller.preview(i);
  assert.equal(f.targets.length, 100);
  assert.equal(f.writes.length, 1);
  assert.equal(f.controller.getTarget(), 100);
  f.advance(100);
  f.complete();
  f.advance(32);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].time, 100);
});

test("a decoded preview is allowed to paint before starting the next queued seek", () => {
  const f = fixture();
  f.controller.begin();
  f.controller.preview(10);
  f.controller.preview(80);
  f.advance(150);
  f.complete();
  f.advance(31);
  assert.equal(f.writes.length, 1);
  f.advance(1);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].time, 80);
});

test("preview pacing is not a trailing debounce: newest target runs without waiting for pointer idle", () => {
  const f = fixture();
  f.controller.begin();
  f.controller.preview(10);
  f.complete();
  f.controller.preview(20);
  f.advance(99);
  assert.equal(f.writes.length, 1);
  f.controller.preview(30);
  f.advance(1);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].time, 30);
});

test("pointerup preempts a slow preview and always seeks the exact final position", () => {
  const f = fixture({ fast: true });
  f.controller.begin();
  f.controller.preview(200.7);
  f.controller.preview(500);
  f.controller.commit(800.7);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[0].kind, "fast");
  assert.equal(f.writes[1].kind, "exact");
  assert.equal(f.writes[1].time, 800.7);
  f.controller.complete();
  assert.equal(f.controller.isPending(), true);
  f.complete();
  assert.equal(f.controller.isPending(), false);
  assert.equal(f.settled.at(-1), 800.7);
  assert.equal(f.targets.at(-1), null);
});

test("commit deduplicates an already decoded preview", () => {
  const f = fixture();
  f.controller.begin();
  f.controller.preview(50);
  f.complete();
  f.controller.commit(50);
  assert.equal(f.writes.length, 1);
  assert.equal(f.controller.isPending(), false);
  assert.equal(f.settled.at(-1), 50);
});

test("small keyboard steps are not discarded by the coarse preview tolerance", () => {
  const f = fixture();
  f.controller.commit(0.1);
  assert.equal(f.writes.length, 1);
  assert.equal(f.video.currentTime, 0.1);
});

test("rapid ±10s starts from the pending target, not an old playback position", () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) f.controller.commit((f.controller.getTarget() ?? 0) + 10);
  assert.equal(f.controller.getTarget(), 50);
  f.complete();
  assert.equal(f.video.currentTime, 50);
});

test("clamps targets, ignores invalid values, and clears pending work on source change", () => {
  const f = fixture();
  f.controller.commit(-10);
  assert.equal(f.controller.getTarget(), null);
  f.controller.commit(Infinity);
  assert.equal(f.writes.length, 0);
  f.controller.preview(10000);
  assert.equal(f.controller.getTarget(), 1440);
  f.controller.preview(20);
  f.controller.reset();
  f.advance(5000);
  assert.equal(f.writes.length, 1);
  assert.equal(f.controller.isPending(), false);
  assert.equal(f.timers.size, 0);
});

test("a slow obsolete preview is superseded within 250ms without waiting for pointer idle", () => {
  const f = fixture();
  f.controller.begin();
  f.controller.preview(10);
  f.controller.preview(90);
  f.advance(249);
  assert.equal(f.writes.length, 1);
  f.advance(1);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].time, 90);
  f.controller.destroy();
  assert.equal(f.timers.size, 0);
  f.controller.commit(100);
  assert.equal(f.writes.length, 2);
});

test("release at an in-flight target does not cancel and restart its segment load", () => {
  const f = fixture();
  f.controller.begin();
  f.controller.preview(50);
  f.controller.commit(50);
  assert.equal(f.writes.length, 1);
  assert.equal(f.controller.isPending(), true);
  f.complete();
  assert.equal(f.controller.isPending(), false);
});

test("fastSeek is always followed by an exact commit even near the target", () => {
  const f = fixture({ fast: true });
  f.controller.begin();
  f.controller.preview(50.01);
  f.complete();
  f.controller.commit(50.01);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].kind, "exact");
  assert.equal(f.video.currentTime, 50.01);
});

test("watchdog keeps a genuinely loading seek pending instead of claiming a decoded frame", () => {
  const f = fixture();
  f.controller.commit(200);
  f.advance(1200);
  assert.equal(f.controller.isPending(), true);
  assert.equal(f.controller.getTarget(), 200);
  f.video.seeking = false; // seeked event was lost, but the video is now ready
  f.advance(1200);
  assert.equal(f.controller.isPending(), false);
  assert.equal(f.targets.at(-1), null);
});

test("coarse segment previews still commit the exact requested time", () => {
  const f = fixture({ coarse: true });
  f.controller.begin();
  f.controller.preview(57.8);
  assert.equal(f.video.currentTime, 50.12);
  assert.equal(f.controller.getTarget(), 57.8);
  f.controller.commit(57.8);
  assert.equal(f.video.currentTime, 57.8);
});

test("pointer movement inside one segment reuses the in-flight preview", () => {
  const f = fixture({ coarse: true });
  f.controller.begin();
  f.controller.preview(51);
  f.advance(100);
  f.controller.preview(55);
  f.advance(100);
  f.controller.preview(58);
  assert.equal(f.writes.length, 1);
  assert.equal(f.controller.getTarget(), 58);
  f.controller.commit(58);
  assert.equal(f.writes.length, 2);
  assert.equal(f.video.currentTime, 58);
});

test("parses independent VOD segments including byte ranges and rejects live/master playlists", () => {
  const manifest = '#EXTM3U\n#EXT-X-INDEPENDENT-SEGMENTS\n#EXTINF:10.2,\n#EXT-X-BYTERANGE:1000@188\none.ts\n#EXTINF:8.5,\ntwo.ts\n#EXTINF:2,\nthree.ts\n#EXT-X-ENDLIST\n';
  assert.deepEqual(Array.from(parseIndependentSegmentStarts(manifest)), [0, 10.2, 18.7]);
  assert.equal(getSegmentPreviewTime(15, parseIndependentSegmentStarts(manifest)), 10.319999999999999);
  assert.equal(getSegmentPreviewTime(0, []), 0);
  assert.equal(parseIndependentSegmentStarts(manifest.replace('#EXT-X-ENDLIST', '')).length, 0);
  assert.equal(parseIndependentSegmentStarts(manifest.replace('#EXT-X-INDEPENDENT-SEGMENTS', '')).length, 0);
  assert.equal(parseIndependentSegmentStarts(manifest + '#EXT-X-STREAM-INF:BANDWIDTH=1000\nquality.m3u8').length, 0);
});

test("falls back to JWPlayer when a native video is unavailable", () => {
  const f = fixture({ fallback: true });
  f.controller.commit(200);
  assert.equal(f.writes[0].kind, "fallback");
  f.controller.complete();
  assert.equal(f.settled.at(-1), 200);
});
