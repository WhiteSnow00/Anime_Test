const fs = require('fs');
const path = 'src/data/anime.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');
console.log(lines[61]); // Line 62 (0-indexed 61)
console.log(lines[205]); // Line 206 (Episode 13)
