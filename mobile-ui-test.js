// Mobile UI Test Checklist
// Run this in browser console on mobile or mobile simulator

console.log('🧪 Mobile Comment UI Test Checklist');

// Test 1: Check if CSS classes are loaded
const testCSS = () => {
  const styles = getComputedStyle(document.documentElement);
  console.log('✅ CSS Test:');
  
  // Check if mobile input font size is correct
  const input = document.querySelector('.mobile-input');
  if (input) {
    const fontSize = getComputedStyle(input).fontSize;
    console.log(`   - Mobile input font-size: ${fontSize} (should be 16px)`);
  }
  
  // Check touch targets
  const touchTargets = document.querySelectorAll('.touch-target-lg');
  console.log(`   - Touch targets found: ${touchTargets.length}`);
  
  return true;
};

// Test 2: Check responsive classes
const testResponsive = () => {
  console.log('✅ Responsive Test:');
  const submitBtn = document.querySelector('button[type="submit"]');
  if (submitBtn) {
    const classes = submitBtn.className;
    console.log(`   - Submit button has w-full: ${classes.includes('w-full')}`);
    console.log(`   - Submit button has sm:w-auto: ${classes.includes('sm:w-auto')}`);
  }
  return true;
};

// Test 3: Check mobile spacing
const testSpacing = () => {
  console.log('✅ Spacing Test:');
  const commentSection = document.querySelector('[data-section="comment"]');
  if (commentSection) {
    const hasBottomMargin = commentSection.className.includes('mb-20');
    console.log(`   - Bottom margin for mobile nav: ${hasBottomMargin}`);
  }
  return true;
};

// Test 4: Check emoji helper height
const testEmojiHelper = () => {
  console.log('✅ Emoji Helper Test:');
  const emojiHelper = document.querySelector('.emoji-helper-mobile');
  if (emojiHelper) {
    const height = getComputedStyle(emojiHelper).maxHeight;
    console.log(`   - Emoji helper max-height: ${height}`);
  }
  return true;
};

// Run all tests
const runMobileTests = () => {
  console.log('🚀 Starting Mobile UI Tests...');
  
  setTimeout(() => {
    testCSS();
    testResponsive();
    testSpacing();
    testEmojiHelper();
    
    console.log('✅ Mobile UI tests completed!');
    console.log('📱 Now test manually:');
    console.log('   1. Tap comment form inputs (no zoom on iOS)');
    console.log('   2. Open emoji selector and scroll');
    console.log('   3. Submit a comment (button should be large)');
    console.log('   4. Switch between navigation sections');
  }, 1000);
};

// Auto-run if this script is pasted in console
if (typeof window !== 'undefined') {
  runMobileTests();
}
