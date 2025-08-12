export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  feedback: string[];
  percentage: number;
}

export interface StrengthSettings {
  enableUnicodeProps: boolean;
  minLength: number;
  strongLength: number;
  veryStrongLength: number;
  scanDepth: number;
  entropyThresholds: [number, number, number];
  entropyFactorMin: number;
  maxScore: number;
  penalties: {
    repeating: number;
    sequential: number;
    keyboard: number;
    date: number;
    dictionary: number;
    personal: number;
    simple: number;
  };
  bonuses: {
    length8: number;
    length12: number;
    length16: number;
    variety3: number;
    variety4andLen10: number;
    entropy40: number;
    entropy50: number;
    entropy60: number;
    mixedCaseTransitions2: number;
    specialsSpread: number;
  };
}

export interface CheckOptions {
  username?: string;
  email?: string;
  banned?: string[];
  settings?: Partial<StrengthSettings>;
}

const vi = {
  empty: 'Mật khẩu không được để trống',
  len: 'Nên có ít nhất 8 ký tự',
  lower: 'Thêm chữ thường',
  upper: 'Thêm chữ hoa',
  num: 'Thêm số',
  special: 'Thêm ký tự đặc biệt',
  repeat: 'Tránh ký tự lặp lại liên tiếp',
  seq: 'Tránh chuỗi ký tự liên tiếp',
  kb: 'Tránh các mẫu bàn phím',
  date: 'Tránh ngày / năm',
  patt: 'Tránh mẫu lặp lại',
  simple: 'Mật khẩu quá đơn giản',
  very: 'Mật khẩu rất mạnh!',
  good: 'Mật khẩu tốt',
  mixed: 'Cần kết hợp nhiều loại ký tự hơn',
  predictable: 'Mật khẩu dễ đoán',
  personal: 'Tránh dùng thông tin cá nhân'
};

const DefaultSettings: StrengthSettings = {
  enableUnicodeProps: true,
  minLength: 8,
  strongLength: 12,
  veryStrongLength: 16,
  scanDepth: 64,
  entropyThresholds: [40, 50, 60],
  entropyFactorMin: 0.3,
  maxScore: 4,
  penalties: {
    repeating: 1,
    sequential: 0.8,
    keyboard: 0.7,
    date: 0.5,
    dictionary: 1.2,
    personal: 1,
    simple: 1
  },
  bonuses: {
    length8: 0.5,
    length12: 0.5,
    length16: 0.5,
    variety3: 0.5,
    variety4andLen10: 0.5,
    entropy40: 0.3,
    entropy50: 0.3,
    entropy60: 0.4,
    mixedCaseTransitions2: 0.3,
    specialsSpread: 0.2
  }
};

function supportsUnicodeProps(): boolean {
  try { new RegExp('\\p{Ll}','u'); return true; } catch { return false; }
}

const USE_UNICODE = supportsUnicodeProps();

const RE_LOWER = USE_UNICODE ? /\p{Ll}/u : /[a-z]/;
const RE_UPPER = USE_UNICODE ? /\p{Lu}/u : /[A-Z]/;
const RE_DIGIT = USE_UNICODE ? /\p{Nd}/u : /\d/;
const RE_SPECIAL = /[^a-zA-Z0-9]/;

function normalizeForChecks(s: string): string {
  const base = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const map: Record<string, string> = { '0':'o','1':'i','!':'i','|':'i','3':'e','4':'a','@':'a','$':'s','5':'s','7':'t','9':'g','8':'b' };
  return base.replace(/[0!|134@$5798]/g, c => map[c] ?? c).toLowerCase();
}

function charspace(p: string): number {
  let cs = 0;
  if (RE_LOWER.test(p)) cs += 26;
  if (RE_UPPER.test(p)) cs += 26;
  if (RE_DIGIT.test(p)) cs += 10;
  if (RE_SPECIAL.test(p)) cs += 32;
  return cs;
}

function calculateEntropy(p: string, settings: StrengthSettings): number {
  const cs = charspace(p);
  if (cs === 0) return 0;
  const base = p.length * Math.log2(cs);
  const s = p.slice(0, Math.max(2, Math.min(settings.scanDepth, p.length)));
  const n = s.length;
  if (n < 2) return base * settings.entropyFactorMin;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) || 0) + 1);
  let sh = 0;
  for (const c of freq.values()) { const pr = c / n; sh -= pr * Math.log2(pr); }
  const denom = Math.log2(n);
  const uniqueRatio = freq.size / n;
  const adjust = denom > 0 ? (sh / denom) * uniqueRatio : settings.entropyFactorMin;
  const factor = Math.max(settings.entropyFactorMin, Math.min(1, adjust));
  return base * factor;
}

function wordset(extra?: string[]): Set<string> {
  const base = [
    'password','admin','login','welcome','letmein','monkey','dragon','football','baseball','master',
    'hello','shadow','superman','michael','sunshine','qwerty','abc','iloveyou','princess','trustno',
    'access','secret','private','security','guest','matkhau','yeuem','ngaysinh','thang','nam','vietnam'
  ];
  return new Set([...(extra || []), ...base]);
}

function isInDictionary(p: string, banned?: string[]): boolean {
  const normalized = normalizeForChecks(p);
  const dict = wordset(banned);
  for (const w of dict) {
    const r = [...w].reverse().join('');
    if (normalized.includes(w) || normalized.includes(r)) return true;
  }
  const pat = /^(password|admin|user|test|guest|demo)\d+$/;
  const rev = [...normalized].reverse().join('');
  return pat.test(normalized) || pat.test(rev);
}

function hasPersonalInfo(p: string, username?: string, email?: string): boolean {
  const t = normalizeForChecks(p);
  const parts: string[] = [];
  if (username) parts.push(...normalizeForChecks(username).split(/[^a-z0-9]+/).filter(x => x.length >= 3));
  if (email) {
    const low = normalizeForChecks(email);
    const [prefix] = low.split('@');
    if (prefix) parts.push(...prefix.split(/[^a-z0-9]+/).filter(x => x.length >= 3));
    parts.push(low);
  }
  for (const seg of parts) {
    if (!seg) continue;
    const r = [...seg].reverse().join('');
    if (t.includes(seg) || t.includes(r)) return true;
  }
  return false;
}

function hasSequentialChars(p: string, minLen = 3): boolean {
  const s = normalizeForChecks(p);
  const a = 'abcdefghijklmnopqrstuvwxyz';
  const d = '0123456789';
  const banks = [a, [...a].reverse().join(''), d, [...d].reverse().join('')];
  for (const bank of banks) {
    for (let i = 0; i <= bank.length - minLen; i++) {
      if (s.includes(bank.slice(i, i + minLen))) return true;
    }
  }
  return false;
}
const KEY_ROWS = ['`1234567890-=','qwertyuiop[]\\','asdfghjkl;\'','zxcvbnm,./'];

function hasKeyboardPattern(p: string): boolean {
  const s = normalizeForChecks(p).slice(0, 48);
  if (s.length < 3) return false;
  for (const row of KEY_ROWS) {
    const r = row.toLowerCase();
    const rev = [...r].reverse().join('');
    for (let i = 0; i <= s.length - 3; i++) {
      const chunk = s.slice(i, i + 3);
      if (r.includes(chunk) || rev.includes(chunk)) return true;
    }
  }
  const diagonals = ['1qaz','2wsx','3edc','4rfv','5tgb','6yhn','7ujm','qaz','wsx','edc','rfv','tgb','yhn','ujm'];
  for (const k of diagonals) {
    const kr = [...k].reverse().join('');
    if (s.includes(k) || s.includes(kr)) return true;
  }
  return false;
}

function hasRepeatingPatterns(p: string): boolean {
  if (p.length < 3) return false;
  const s = p.slice(0, 64);
  for (let i = 2; i < s.length; i++) {
    if (s[i] === s[i - 1] && s[i] === s[i - 2]) return true;
  }
  const n = s.length;
  for (let unit = 3; unit <= 6; unit++) {
    for (let i = 0; i + unit * 2 <= n; i++) {
      const seg = s.slice(i, i + unit);
      let run = 1, j = i + unit;
      while (j + unit <= n && s.slice(j, j + unit) === seg) { run++; j += unit; }
      if (run >= 2) return true;
    }
  }
  for (let i = 0; i + 6 <= n; i++) {
    const seg = s.slice(i, i + 2);
    if (s.slice(i + 2, i + 4) === seg && s.slice(i + 4, i + 6) === seg) return true;
  }
  const seps = '_-. ';
  for (let unit = 2; unit <= 6; unit++) {
    for (let i = 0; i + unit * 2 + 1 <= n; i++) {
      const seg = s.slice(i, i + unit);
      const sep = s[i + unit];
      if (!seps.includes(sep)) continue;
      const next = s.slice(i + unit + 1, i + unit + 1 + unit);
      if (next !== seg) continue;
      return true;
    }
  }

  return false;
}

function isSimplePattern(p: string): boolean {
  if (p.length > 64) return false;
  if (/^[a-z]+$/i.test(p) || /^\d+$/.test(p)) return true;
  if (/^[a-zA-Z]+\d{1,6}$/.test(p)) return true;
  if (/^\d{1,6}[a-zA-Z]+$/.test(p)) return true;
  if (/^[a-zA-Z]+[!@#$%^&*()]+\d*$/.test(p)) return true;
  return false;
}

function hasDatePattern(p: string): boolean {
  const s = normalizeForChecks(p).slice(0, 64);
  if (/(19|20)\d{2}/.test(s)) return true;
  if (/\b\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?\b/.test(s)) return true;
  const compact = s.replace(/\D/g, '');
  if (/\d{8}/.test(compact) || /\d{6}/.test(compact)) return true;
  return false;
}

function calculateComplexity(p: string, settings: StrengthSettings): number {
  let c = 0;
  const t = [RE_LOWER.test(p), RE_UPPER.test(p), RE_DIGIT.test(p), RE_SPECIAL.test(p)].filter(Boolean).length;
  c += t * 0.5;
  if (p.length >= 10) c += 0.5;
  if (p.length >= 14) c += 0.5;
  if (RE_LOWER.test(p) && RE_UPPER.test(p)) {
    let tr = 0; const m = Math.min(p.length - 1, 48);
    for (let i = 0; i < m; i++) {
      const a = p[i], b = p[i + 1];
      if ((/[a-z]/.test(a) && /[A-Z]/.test(b)) || (/[A-Z]/.test(a) && /[a-z]/.test(b))) tr++;
    }
    if (tr >= 2) c += DefaultSettings.bonuses.mixedCaseTransitions2;
  }
  if (RE_SPECIAL.test(p)) {
    const first = p.search(RE_SPECIAL);
    const last = p.length - 1 - [...p].reverse().join('').search(RE_SPECIAL);
    if (first > 0 && last < p.length - 1) c += DefaultSettings.bonuses.specialsSpread;
  }
  return c;
}

function passphraseHeuristic(p: string): { ok: boolean; words: number } {
  const parts = p.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 4) return { ok: false, words: parts.length };
  const avg = parts.reduce((s, w) => s + w.length, 0) / parts.length;
  if (avg >= 4) return { ok: true, words: parts.length };
  return { ok: false, words: parts.length };
}

function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

export function checkPasswordStrength(password = '', options?: CheckOptions): PasswordStrength {
  const settings: StrengthSettings = { ...DefaultSettings, ...(options?.settings || {}) };
  const feedback: string[] = [];
  let score = 0;

  const pwd = password.trim();
  if (!pwd) return { score: 0, level: 'weak', feedback: [vi.empty], percentage: 0 };
  const len = pwd.length;

  if (len >= settings.minLength) score += settings.bonuses.length8; else feedback.push(vi.len);
  if (len >= settings.strongLength) score += settings.bonuses.length12;
  if (len >= settings.veryStrongLength) score += settings.bonuses.length16;

  const hasLower = RE_LOWER.test(pwd);
  const hasUpper = RE_UPPER.test(pwd);
  const hasNumber = RE_DIGIT.test(pwd);
  const hasSpecial = RE_SPECIAL.test(pwd);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (!hasLower) feedback.push(vi.lower);
  if (!hasUpper) feedback.push(vi.upper);
  if (!hasNumber) feedback.push(vi.num);
  if (!hasSpecial) feedback.push(vi.special);

  if (varietyCount >= 3) score += settings.bonuses.variety3;
  if (varietyCount === 4 && len >= 10) score += settings.bonuses.variety4andLen10;
  else if (varietyCount < 3 && len >= settings.minLength) feedback.push(vi.mixed);

  const entropy = calculateEntropy(pwd, settings);
  const [e40, e50, e60] = settings.entropyThresholds;
  if (entropy >= e40) score += settings.bonuses.entropy40;
  if (entropy >= e50) score += settings.bonuses.entropy50;
  if (entropy >= e60) score += settings.bonuses.entropy60;

  score += calculateComplexity(pwd, settings);

  if (hasRepeatingPatterns(pwd)) { score -= settings.penalties.repeating; feedback.push(vi.patt); }
  if (hasSequentialChars(pwd)) { score -= settings.penalties.sequential; feedback.push(vi.seq); }
  if (hasKeyboardPattern(pwd)) { score -= settings.penalties.keyboard; feedback.push(vi.kb); }
  if (hasDatePattern(pwd)) { score -= settings.penalties.date; feedback.push(vi.date); }

  const dictHit = isInDictionary(pwd, options?.banned);
  if (dictHit) { score -= settings.penalties.dictionary; feedback.push(vi.predictable); }
  if (options && hasPersonalInfo(pwd, options.username, options.email)) { score -= settings.penalties.personal; feedback.push(vi.personal); }
  if (isSimplePattern(pwd)) { score -= settings.penalties.simple; if (!feedback.includes(vi.simple)) feedback.push(vi.simple); }
  const passphrase = passphraseHeuristic(pwd);
  if (passphrase.ok && entropy >= e50) { score = Math.max(score, 3.2); }
  score = clamp(score, 0, settings.maxScore);
  if (entropy < 35 && score > 2.5) score = 2.5;
  if (entropy < 45 && score > 3) score = 3;
  if (varietyCount < 3 && score > 2) score = 2;
  if (len < 12 && score > 3) score = 3;
  if (dictHit && score > 2) score = 2;

  let level: PasswordStrength['level'];
  if (score < 1.5) level = 'weak';
  else if (score < 2.5) level = 'medium';
  else if (score < 3.5) level = 'strong';
  else level = 'very-strong';

  if (level === 'very-strong' && feedback.length === 0) feedback.push(vi.very);
  else if (level === 'strong' && feedback.length <= 1) feedback.push(vi.good);

  return { score, level, feedback, percentage: (score / settings.maxScore) * 100 };
}

export function getStrengthColor(l: PasswordStrength['level']): string {
  switch (l) {
    case 'weak': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'strong': return 'text-green-500';
    case 'very-strong': return 'text-purple-500';
    default: return 'text-gray-500';
  }
}

export function getStrengthBgColor(l: PasswordStrength['level']): string {
  switch (l) {
    case 'weak': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'strong': return 'bg-green-500';
    case 'very-strong': return 'bg-purple-500';
    default: return 'bg-gray-300';
  }
}

export function getStrengthLabel(l: PasswordStrength['level']): string {
  switch (l) {
    case 'weak': return 'Yếu';
    case 'medium': return 'Trung bình';
    case 'strong': return 'Mạnh';
    case 'very-strong': return 'Rất mạnh';
    default: return '';
  }
}

export function getStrengthBarSegments(level: PasswordStrength['level']): [boolean, boolean, boolean, boolean] {
  if (level === 'weak') return [true,false,false,false];
  if (level === 'medium') return [true,true,false,false];
  if (level === 'strong') return [true,true,true,false];
  return [true,true,true,true];
}
