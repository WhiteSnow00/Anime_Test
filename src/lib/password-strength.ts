export interface PasswordStrength {
  score: number;
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  feedback: string[];
  percentage: number;
}

const vi = {
  empty:'Mật khẩu không được để trống',
  len:'Nên có ít nhất 8 ký tự',
  lower:'Thêm chữ thường',
  upper:'Thêm chữ hoa',
  num:'Thêm số',
  special:'Thêm ký tự đặc biệt',
  repeat:'Tránh ký tự lặp lại liên tiếp',
  seq:'Tránh chuỗi ký tự liên tiếp',
  kb:'Tránh các mẫu bàn phím',
  date:'Tránh ngày / năm',
  patt:'Tránh mẫu lặp lại',
  simple:'Mật khẩu quá đơn giản',
  very:'Mật khẩu rất mạnh!',
  good:'Mật khẩu tốt',
  mixed:'Cần kết hợp nhiều loại ký tự hơn',
  predictable:'Mật khẩu dễ đoán',
  personal:'Tránh dùng thông tin cá nhân'
};

function calculateEntropy(p: string): number {
  let charSpace = 0;
  if (/[a-z]/.test(p)) charSpace += 26;
  if (/[A-Z]/.test(p)) charSpace += 26;
  if (/\d/.test(p)) charSpace += 10;
  if (/[^a-zA-Z0-9]/.test(p)) charSpace += 32;
  
  if (charSpace === 0) return 0;
  
  // Basic entropy
  let entropy = p.length * Math.log2(charSpace);
  
  const checkStr = p.slice(0, 50);
  const charCount = new Map<string, number>();
  
  for (const char of checkStr) {
    charCount.set(char, (charCount.get(char) || 0) + 1);
  }
  
  let shannonEntropy = 0;
  const checkLen = checkStr.length;
  
  for (const count of charCount.values()) {
    const prob = count / checkLen;
    shannonEntropy -= prob * Math.log2(prob);
  }
  
  const uniqueRatio = charCount.size / checkLen;
  const adjustmentFactor = (shannonEntropy / Math.log2(checkLen)) * uniqueRatio;
  
  return entropy * Math.max(.3, adjustmentFactor);
}

function isInDictionary(p: string): boolean {
  const normalized = p.toLowerCase()
    .replace(/[0@]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[9]/g, 'g')
    .replace(/[8]/g, 'b');
    
  const commonWords = [
    'password', 'admin', 'login', 'welcome', 'letmein',
    'monkey', 'dragon', 'football', 'baseball', 'master',
    'hello', 'shadow', 'superman', 'michael', 'sunshine',
    'qwerty', 'abc', 'iloveyou', 'princess', 'trustno',
    'access', 'secret', 'private', 'security', 'guest'
  ];
  
  // Check both normal and reversed words
  for (const word of commonWords) {
    if (normalized.includes(word) || normalized.includes([...word].reverse().join(''))) {
      return true;
    }
  }
  
  // Check for number patterns after common words
  const wordWithNumbers = /^(password|admin|user|test|guest|demo)\d+$/;
  if (wordWithNumbers.test(normalized)) return true;
  
  // Check reversed patterns too
  const reversedNormalized = [...normalized].reverse().join('');
  if (wordWithNumbers.test(reversedNormalized)) return true;
  
  return false;
}

// Optional: check personal info (pass username/email as params if needed)
function hasPersonalInfo(p: string, username?: string, email?: string): boolean {
  if (!username && !email) return false;
  
  const normalized = p.toLowerCase();
  
  if (username && normalized.includes(username.toLowerCase())) {
    return true;
  }
  
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (normalized.includes(emailPrefix)) {
      return true;
    }
  }
  
  return false;
}

function hasSequentialChars(p: string, minLen = 3): boolean {
  const lower = p.toLowerCase();
  const len = Math.min(lower.length, 50);
  
  for (let i = 0; i < len - minLen + 1; i++) {
    let isSeq = true;
    let isRevSeq = true;
    
    for (let j = 1; j < minLen; j++) {
      const curr = lower.charCodeAt(i + j);
      const prev = lower.charCodeAt(i + j - 1);
      
      if (curr !== prev + 1) isSeq = false;
      if (curr !== prev - 1) isRevSeq = false;
      
      if (!isSeq && !isRevSeq) break;
    }
    
    if (isSeq || isRevSeq) return true;
  }
  return false;
}

function hasKeyboardPattern(p: string): boolean {
  const rows = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890'
  ];
  
  const lower = p.toLowerCase().slice(0, 30);
  
  for (const row of rows) {
    for (let i = 0; i < lower.length - 2; i++) {
      const chunk = lower.slice(i, i + 3);
      if (row.includes(chunk) || row.includes([...chunk].reverse().join(''))) {
        return true;
      }
    }
  }
  
  if (/1qaz|2wsx|3edc|qaz|wsx|edc/.test(lower)) return true;
  
  return false;
}

function hasRepeatingPatterns(p: string): boolean {
  for (let i = 0; i < p.length - 2; i++) {
    if (p[i] === p[i + 1] && p[i] === p[i + 2]) return true;
  }
  
  const maxCheck = Math.min(p.length, 20);
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= maxCheck - len * 2; i++) {
      const pattern = p.slice(i, i + len);
      if (p.slice(i + len, i + len * 2) === pattern) return true;
    }
  }
  
  if (p.length >= 4) {
    for (let i = 0; i < Math.min(p.length - 3, 20); i++) {
      if (p[i] === p[i + 2] && p[i + 1] === p[i + 3]) return true;
    }
  }
  
  return false;
}

function isSimplePattern(p: string): boolean {
  if (p.length > 30) return false;
  
  if (/^[a-z]+$/i.test(p) || /^\d+$/.test(p)) return true;
  
  if (/^[a-zA-Z]+\d{1,4}$/.test(p)) return true;
  if (/^\d{1,4}[a-zA-Z]+$/.test(p)) return true;
  
  if (/^[a-zA-Z]+[!@#$%^&*()]+\d*$/.test(p)) return true;
  
  return false;
}

function hasDatePattern(p: string): boolean {
  const searchStr = p.slice(0, 20);
  
  if (/(19|20)\d{2}/.test(searchStr)) return true;
  
  if (/\d{1,2}[\/\-\.]\d{1,2}/.test(searchStr)) return true;
  
  const digitMatch = searchStr.match(/\d{6,8}/);
  if (digitMatch) {
    const nums = digitMatch[0];
    const a = parseInt(nums.slice(0, 2));
    const b = parseInt(nums.slice(2, 4));
    
    if ((a >= 1 && a <= 31 && b >= 1 && b <= 12) ||
        (a >= 1 && a <= 12 && b >= 1 && b <= 31)) {
      return true;
    }
  }
  return false;
}
function calculateComplexity(p: string): number {
  let complexity = 0;
  
  const types = [
    /[a-z]/.test(p),
    /[A-Z]/.test(p),
    /\d/.test(p),
    /[^a-zA-Z0-9]/.test(p)
  ].filter(Boolean).length;
  
  complexity += types * .5;
  
  if (p.length >= 10) complexity += .5;
  if (p.length >= 14) complexity += .5;
  
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) {
    let transitions = 0;
    const checkLen = Math.min(p.length - 1, 30);
    for (let i = 0; i < checkLen; i++) {
      const curr = p[i];
      const next = p[i + 1];
      if ((curr >= 'a' && curr <= 'z' && next >= 'A' && next <= 'Z') ||
          (curr >= 'A' && curr <= 'Z' && next >= 'a' && next <= 'z')) {
        transitions++;
      }
    }
    if (transitions >= 2) complexity += .3;
  }
  
  if (/[^a-zA-Z0-9]/.test(p)) {
    const firstSpecial = p.search(/[^a-zA-Z0-9]/);
    const lastSpecial = p.length - 1 - [...p].reverse().join('').search(/[^a-zA-Z0-9]/);
    if (firstSpecial > 0 && lastSpecial < p.length - 1) complexity += .2;
  }
  
  return complexity;
}

// Main function with optional personal info params
export function checkPasswordStrength(
  password = '', 
  options?: { username?: string; email?: string }
): PasswordStrength {
  if (!password) return { score: 0, level: 'weak', feedback: [vi.empty], percentage: 0 };

  let score = 0;
  const feedback: string[] = [];
  const len = password.length;

  // Length scoring
  if (len >= 8) score += .5;
  else feedback.push(vi.len);
  if (len >= 12) score += .5;
  if (len >= 16) score += .5;

  // Character requirements
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  
  if (!hasLower) feedback.push(vi.lower);
  if (!hasUpper) feedback.push(vi.upper);
  if (!hasNumber) feedback.push(vi.num);
  if (!hasSpecial) feedback.push(vi.special);

  // Variety scoring
  if (varietyCount >= 3) score += .5;
  if (varietyCount === 4 && len >= 10) score += .5;
  else if (varietyCount < 3 && len >= 8) feedback.push(vi.mixed);

  const entropy = calculateEntropy(password);
  if (entropy >= 40) score += .3;
  if (entropy >= 50) score += .3;
  if (entropy >= 60) score += .4;

  score += calculateComplexity(password);

  if (hasRepeatingPatterns(password)) {
    score -= 1;
    feedback.push(vi.patt);
  }

  if (hasSequentialChars(password)) {
    score -= .8;
    feedback.push(vi.seq);
  }

  if (hasKeyboardPattern(password)) {
    score -= .7;
    feedback.push(vi.kb);
  }

  if (hasDatePattern(password)) {
    score -= .5;
    feedback.push(vi.date);
  }

  if (isInDictionary(password)) {
    score -= 1.2;
    feedback.push(vi.predictable);
  }

  if (options && hasPersonalInfo(password, options.username, options.email)) {
    score -= 1;
    feedback.push(vi.personal);
  }

  if (isSimplePattern(password)) {
    score -= 1;
    if (!feedback.includes(vi.simple)) feedback.push(vi.simple);
  }

  score = Math.max(0, Math.min(4, score));
  if (entropy < 35 && score > 2.5) score = 2.5;
  if (entropy < 45 && score > 3) score = 3;
  if (varietyCount < 3 && score > 2) score = 2;
  if (len < 12 && score > 3) score = 3;
  if (isInDictionary(password) && score > 2) score = 2;

  let level: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 1.5) level = 'weak';
  else if (score < 2.5) level = 'medium';
  else if (score < 3.5) level = 'strong';
  else level = 'very-strong';

  if (level === 'very-strong' && feedback.length === 0) feedback.push(vi.very);
  else if (level === 'strong' && feedback.length <= 1) feedback.push(vi.good);

  return {
    score,
    level,
    feedback,
    percentage: (score / 4) * 100
  };
}

export function getStrengthColor(l: PasswordStrength['level']): string {
  switch(l) {
    case 'weak': return 'text-red-500';
    case 'medium': return 'text-yellow-500';
    case 'strong': return 'text-green-500';
    case 'very-strong': return 'text-purple-500';
    default: return 'text-gray-500';
  }
}

export function getStrengthBgColor(l: PasswordStrength['level']): string {
  switch(l) {
    case 'weak': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'strong': return 'bg-green-500';
    case 'very-strong': return 'bg-purple-500';
    default: return 'bg-gray-300';
  }
}

export function getStrengthLabel(l: PasswordStrength['level']): string {
  switch(l) {
    case 'weak': return 'Yếu';
    case 'medium': return 'Trung bình';
    case 'strong': return 'Mạnh';
    case 'very-strong': return 'Rất mạnh';
    default: return '';
  }
}