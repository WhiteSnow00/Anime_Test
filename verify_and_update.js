const fs = require('fs');
const path = 'src/data/anime.ts';

try {
    const content = fs.readFileSync(path, 'utf8');
    console.log('--- Current Content Preview ---');
    // Print lines that contain 'hls:' to see what they look like
    const lines = content.split('\n');
    let count = 0;
    lines.forEach((line, index) => {
        if (line.includes('hls:') && count < 5) {
            console.log(`${index + 1}: ${line.trim()}`);
            count++;
        }
    });

    // Check if we need to update
    if (content.includes('f004.backblazeb2.com')) {
        console.log('\nFound Backblaze URLs. Updating...');
        const newContent = content.replace(/f004\.backblazeb2\.com/g, 'play.ninoyo.com');
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Update complete.');
    } else {
        console.log('\nNo Backblaze URLs found. File might already be updated.');
    }

} catch (err) {
    console.error(err);
}
