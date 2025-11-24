
let isRunning = false;
let target = null;
let repeat = true;
let monitorInterval = null;

// Helper to get visible background color (traverses up if transparent)
function getVisibleColor(element) {
  let current = element;
  while (current) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    // Check if color is significant (not transparent or fully alpha 0)
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      return bg;
    }
    current = current.parentElement;
  }
  return 'rgb(255, 255, 255)'; // Default fallback if everything is transparent
}

// Initialize
chrome.storage.local.get(['target', 'isRunning', 'repeat'], (data) => {
  if (data.target) target = data.target;
  if (data.repeat !== undefined) repeat = data.repeat;
  // Always reset running state on page load for safety
  chrome.storage.local.set({ isRunning: false }); 
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_PICKING') {
    startPickingMode();
  } else if (request.action === 'START') {
    repeat = request.repeat;
    isRunning = true;
    startMonitoring();
  } else if (request.action === 'STOP') {
    isRunning = false;
    stopMonitoring();
  } else if (request.action === 'UPDATE_SETTINGS') {
    repeat = request.repeat;
  }
});

function startPickingMode() {
  document.body.style.cursor = 'crosshair';
  
  // Create a full-screen overlay to capture the click
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647', // Max z-index
    cursor: 'crosshair',
    background: 'rgba(79, 70, 229, 0.1)' // Slight indigo tint
  });
  
  // Add instruction label
  const label = document.createElement('div');
  label.textContent = "Click anywhere to set target";
  Object.assign(label.style, {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    pointerEvents: 'none'
  });
  overlay.appendChild(label);
  
  document.body.appendChild(overlay);

  function clickHandler(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const x = e.clientX;
    const y = e.clientY;
    
    // Cleanup
    document.body.removeChild(overlay);
    document.body.style.cursor = '';
    
    // Identify element and color
    const el = document.elementFromPoint(x, y);
    let color = 'rgb(255, 255, 255)';
    
    if (el) {
      color = getVisibleColor(el);
    }
    
    const newTarget = { x, y, color };
    target = newTarget;
    
    chrome.storage.local.set({ target: newTarget });
    
    // Visual confirmation
    showToast(`Target set: ${color}`);
  }
  
  overlay.addEventListener('click', clickHandler, { once: true, capture: true });
}

function startMonitoring() {
  if (monitorInterval) clearInterval(monitorInterval);
  
  console.log('ChromaClicker: Started monitoring', target);
  
  monitorInterval = setInterval(() => {
    if (!isRunning || !target) return;
    
    const el = document.elementFromPoint(target.x, target.y);
    if (el) {
      const currentColor = getVisibleColor(el);
      
      // Compare colors (ignoring spaces)
      if (colorsMatch(currentColor, target.color)) {
        console.log('ChromaClicker: Match! Clicking...');
        
        // Visual indicator of click
        showClickIndicator(target.x, target.y);
        
        // Perform click
        el.click();
        
        if (!repeat) {
          isRunning = false;
          chrome.storage.local.set({ isRunning: false });
          stopMonitoring();
        }
      }
    }
  }, 1000); // Check frequency
}

function stopMonitoring() {
  if (monitorInterval) clearInterval(monitorInterval);
  console.log('ChromaClicker: Stopped');
}

function colorsMatch(c1, c2) {
  if (!c1 || !c2) return false;
  // Simple cleanup
  return c1.replace(/\s/g, '') === c2.replace(/\s/g, '');
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#10b981',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    zIndex: '2147483647',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    transition: 'opacity 0.5s'
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

function showClickIndicator(x, y) {
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    position: 'fixed',
    left: (x - 10) + 'px',
    top: (y - 10) + 'px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.6)',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: 'scale(1)',
    transition: 'transform 0.2s, opacity 0.2s'
  });
  document.body.appendChild(dot);
  
  requestAnimationFrame(() => {
    dot.style.transform = 'scale(2)';
    dot.style.opacity = '0';
  });
  
  setTimeout(() => dot.remove(), 200);
}
