// Run: node --test scripts/test-player-media.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/player-media.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, setTimeout, clearTimeout });
const { createPlayerMediaHandle, isMediaSeekable, shouldShowNextEpisode } = api;

class Video extends EventTarget {
  readyState = 1;
  duration = 1440;
  currentTime = 0;
  seeking = false;
  error = null;
  seekable = { length: 1, start: () => 0, end: () => 1440 };
}
function handle(video, requestSeek = (time) => { video.currentTime = time; video.seeking = true; }) {
  return createPlayerMediaHandle({ getVideo: () => video, requestSeek, play() {}, pause() {} });
}

test('resume stays unavailable at 00:00/00:00, without metadata, or without seekable ranges', () => {
  const video = new Video();
  video.duration = 0;
  assert.equal(isMediaSeekable(video), false);
  video.duration = 1440;
  video.readyState = 0;
  assert.equal(isMediaSeekable(video), false);
  video.readyState = 1;
  video.seekable.length = 0;
  assert.equal(isMediaSeekable(video), false);
  video.seekable.length = 1;
  assert.equal(isMediaSeekable(video, 300), true);
  assert.equal(isMediaSeekable(video, NaN), false);
});

test('resume refuses a target outside the seekable timeline', async () => {
  const video = new Video();
  video.seekable.end = () => 100;
  let calls = 0;
  const media = handle(video, () => calls++);
  assert.equal(await media.seekTo(300), false);
  assert.equal(calls, 0);
});

test('resume resolves only after the saved frame is seeked and decoded', async () => {
  const video = new Video();
  let resolved = false;
  const operation = handle(video).seekTo(300).then((result) => { resolved = true; return result; });
  await Promise.resolve();
  assert.equal(video.currentTime, 300);
  assert.equal(resolved, false);
  video.seeking = false;
  video.dispatchEvent(new Event('seeked'));
  await Promise.resolve();
  assert.equal(resolved, false);
  video.readyState = 2;
  video.dispatchEvent(new Event('loadeddata'));
  assert.equal(await operation, true);
});

test('failed or replaced media does not count as applied resume', async () => {
  const video = new Video();
  const operation = handle(video).seekTo(300);
  video.dispatchEvent(new Event('emptied'));
  assert.equal(await operation, false);
});

test('an already decoded target resolves without a fixed resume delay', async () => {
  const video = new Video();
  video.currentTime = 300;
  video.readyState = 4;
  assert.equal(await handle(video, () => {}).seekTo(300), true);
});

test('next-episode threshold is the last 25 seconds, including the finished state', () => {
  assert.equal(shouldShowNextEpisode(1440, 1414.9), false);
  assert.equal(shouldShowNextEpisode(1440, 1415), true);
  assert.equal(shouldShowNextEpisode(1440, 1440), true);
  assert.equal(shouldShowNextEpisode(0, 0), false);
  assert.equal(shouldShowNextEpisode(Infinity, 1415), false);
  assert.equal(shouldShowNextEpisode(1440, 0), false);
});
