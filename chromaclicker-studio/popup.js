
document.addEventListener('DOMContentLoaded', () => {
  const btnPick = document.getElementById('btnPick');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const statusText = document.getElementById('statusText');
  const colorPreview = document.getElementById('colorPreview');
  const colorValue = document.getElementById('colorValue');
  const coordDisplay = document.getElementById('coordDisplay');
  const repeatCheck = document.getElementById('repeatCheck');

  // Load state
  chrome.storage.local.get(['target', 'isRunning', 'repeat'], (data) => {
    if (data.target) {
      updateTargetUI(data.target);
      btnStart.disabled = data.isRunning; // If running, start is disabled
    }
    
    if (data.repeat !== undefined) {
      repeatCheck.checked = data.repeat;
    }

    if (data.isRunning) {
      setRunningState(true);
    } else {
      setRunningState(false);
    }
  });

  function updateTargetUI(target) {
    colorPreview.style.backgroundColor = target.color;
    colorValue.textContent = target.color;
    coordDisplay.textContent = `(${Math.round(target.x)}, ${Math.round(target.y)})`;
    
    // Enable start if we have a target and not running
    chrome.storage.local.get(['isRunning'], (data) => {
       if (!data.isRunning) btnStart.disabled = false;
    });
  }

  function setRunningState(running) {
    btnStart.disabled = running;
    btnStop.disabled = !running;
    btnPick.disabled = running;
    statusText.textContent = running ? 'MONITORING...' : 'Idle';
    statusText.style.color = running ? '#4ade80' : '#94a3b8';
  }

  btnPick.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Close popup to let user click page, but send message first
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'START_PICKING' });
      window.close();
    } catch (e) {
      statusText.textContent = "Error: Please refresh page";
      statusText.style.color = "var(--danger)";
    }
  });

  btnStart.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const repeat = repeatCheck.checked;
    
    chrome.storage.local.set({ isRunning: true, repeat });
    chrome.tabs.sendMessage(tab.id, { action: 'START', repeat });
    setRunningState(true);
  });

  btnStop.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.storage.local.set({ isRunning: false });
    chrome.tabs.sendMessage(tab.id, { action: 'STOP' });
    setRunningState(false);
  });
  
  repeatCheck.addEventListener('change', (e) => {
    chrome.storage.local.set({ repeat: e.target.checked });
    // If running, update the running instance
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if(tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'UPDATE_SETTINGS', repeat: e.target.checked });
      }
    });
  });
  
  // Listen for messages from content script (e.g. target picked)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TARGET_PICKED') {
      updateTargetUI(message.target);
    }
  });
});
