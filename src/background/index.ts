chrome.runtime.onInstalled.addListener(async () => {
  for (const cs of chrome.runtime.getManifest().content_scripts ?? []) {
    for (const tab of await chrome.tabs.query({ url: cs.matches ?? [] })) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id ?? 0 },
        files: cs.js ?? [],
      })
      cs.css?.forEach(css => {
        chrome.scripting.insertCSS({
          target: { tabId: tab.id ?? 0 },
          files: [css],
        })
      })
    }
  }
})

chrome.runtime.onUpdateAvailable.addListener(() => {
  chrome.runtime.reload()
})

chrome.action.onClicked.addListener(tab => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-dashboard' })
  }
})

// 다른 사이트에서의 CSP 제한을 피하기 위해 백그라운드에서 fetch를 대행합니다.
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'fetch-html') {
    fetch(request.url, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const html = await response.text()
        sendResponse({ success: true, html, finalUrl: response.url })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true // 비동기 응답을 위해 true 반환
  }
})

chrome.runtime.onConnect.addListener(port => {
  if (port.name === '@crx/client') {
    port.onMessage.addListener(() => {
      // Message handling
    })
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Storage change handling
  }
})

export {}
