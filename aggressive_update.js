const fs = require('fs');
const path = require('path');

const targetPath = path.join(process.cwd(), 'src', 'data', 'anime.ts');

try {
    console.log(`Reading file from: ${targetPath}`);
    let content = fs.readFileSync(targetPath, 'utf8');

    // Check for presence of old domain
    if (content.includes('f004.backblazeb2.com')) {
        console.log('Found Backblaze URLs. Replacing...');
        const newContent = content.replace(/f004\.backblazeb2\.com/g, 'play.ninoyo.com');

        fs.writeFileSync(targetPath, newContent, 'utf8');
        console.log('File written.');

        // Verify
        const checkContent = fs.readFileSync(targetPath, 'utf8');
        if (checkContent.includes('play.ninoyo.com') && !checkContent.includes('f004.backblazeb2.com')) {
            console.log('VERIFICATION SUCCESS: File now contains Ninoyo URLs and no Backblaze URLs.');
        } else {
            console.error('VERIFICATION FAILED: File might not have been updated correctly.');
        }
    } else {
        console.log('No Backblaze URLs found in the file. It might already be updated.');
        if (content.includes('play.ninoyo.com')) {
            console.log('File already contains Ninoyo URLs.');
        }
    }
} catch (err) {
    console.error('CRITICAL ERROR:', err);
}
