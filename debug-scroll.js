// Debug script to diagnose mobile scrolling issues
// Run this in browser console: copy and paste, then call debugScroll()

function debugScroll() {
  console.log('=== SCROLL DEBUG DIAGNOSTIC ===');
  
  // Check scroll container
  const scrollContainer = document.getElementById('scroll-container');
  const body = document.body;
  const html = document.documentElement;
  
  console.log('Scroll Container:', scrollContainer);
  console.log('Container styles:', {
    height: scrollContainer?.style.height || getComputedStyle(scrollContainer).height,
    overflow: getComputedStyle(scrollContainer).overflow,
    scrollSnapType: getComputedStyle(scrollContainer).scrollSnapType,
    position: getComputedStyle(scrollContainer).position
  });
  
  console.log('Body styles:', {
    height: getComputedStyle(body).height,
    overflow: getComputedStyle(body).overflow,
    scrollSnapType: getComputedStyle(body).scrollSnapType
  });
  
  console.log('HTML styles:', {
    height: getComputedStyle(html).height,
    overflow: getComputedStyle(html).overflow,
    scrollSnapType: getComputedStyle(html).scrollSnapType
  });
  
  // Check sections
  const sections = document.querySelectorAll('section[id]');
  console.log(`Found ${sections.length} sections:`);
  sections.forEach((section, i) => {
    const rect = section.getBoundingClientRect();
    console.log(`Section ${i} (${section.id}):`, {
      height: rect.height,
      minHeight: getComputedStyle(section).minHeight,
      position: getComputedStyle(section).position,
      snapAlign: getComputedStyle(section).scrollSnapAlign,
      classes: section.className
    });
  });
  
  // Check mobile detection
  const isMobile = window.innerWidth < 768;
  console.log('Is Mobile:', isMobile);
  console.log('Window size:', { width: window.innerWidth, height: window.innerHeight });
  console.log('Viewport height:', window.visualViewport?.height || 'unknown');
  
  // Test scroll behavior
  console.log('Testing scroll behavior...');
  const originalScrollTop = scrollContainer?.scrollTop || window.scrollY;
  
  // Try to scroll
  if (scrollContainer) {
    scrollContainer.scrollTop = 100;
    setTimeout(() => {
      console.log('Scroll test result:', {
        attempted: 100,
        actual: scrollContainer.scrollTop,
        success: scrollContainer.scrollTop > originalScrollTop
      });
      scrollContainer.scrollTop = originalScrollTop; // restore
    }, 100);
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.debugScroll = debugScroll;
  console.log('Debug loaded. Call debugScroll() to run diagnostics.');
}