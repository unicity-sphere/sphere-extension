/**
 * Content script - message relay between inject script and background.
 *
 * This script runs in the context of web pages and:
 * - Injects the inject.js script into the page
 * - Relays messages between page (window.sphere) and background service worker
 */

import { isSphereRequest, isSphereResponse } from '@/shared/messages';
import { isExtensionConnectEnvelope, EXT_MSG_TO_HOST, EXT_MSG_TO_CLIENT } from '@unicitylabs/sphere-sdk/connect/browser';

console.log('Sphere content script loaded');

// Inject the inject.js script into the page
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

injectScript();

// ===========================================================================
// Connect protocol relay (ExtensionTransport)
// ===========================================================================

// Forward sphere-connect-ext:tohost messages from dApp page → background
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!isExtensionConnectEnvelope(event.data)) return;
  if (event.data.type !== EXT_MSG_TO_HOST) return;

  // Fire-and-forget: background ConnectHost listens via chrome.runtime.onMessage
  chrome.runtime.sendMessage(event.data).catch(() => {
    // Background may not be ready yet — ignore
  });
});

// Forward sphere-connect-ext:toclient messages from background → dApp page
chrome.runtime.onMessage.addListener((message) => {
  if (!isExtensionConnectEnvelope(message)) return;
  if (message.type !== EXT_MSG_TO_CLIENT) return;
  window.postMessage(message, '*');
  // Return false: synchronous, no response needed
});

// ===========================================================================
// Legacy SPHERE_* relay (existing custom protocol)
// ===========================================================================

// Listen for messages from the page (inject script)
window.addEventListener('message', async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const { type, requestId, ...data } = event.data || {};

  // Only forward Sphere request messages
  if (!type || !isSphereRequest(type)) return;

  console.log('Content script received request:', type, requestId);

  try {
    // Forward to background service worker
    const response = await chrome.runtime.sendMessage({
      type,
      requestId,
      origin: window.location.origin,
      ...data
    });

    console.log('Content script received response:', response);

    // Don't forward "pending" responses — the inject should wait for SPHERE_TRANSACTION_RESULT
    // which arrives later via chrome.runtime.onMessage after user approves/rejects.
    if (response.pending) return;

    // Send response back to page
    window.postMessage({
      ...response,
      requestId
    }, '*');
  } catch (error) {
    console.error('Content script error:', error);
    // Send error response back to page
    window.postMessage({
      type: `${type}_RESPONSE`,
      requestId,
      success: false,
      error: (error as Error).message || 'Unknown error'
    }, '*');
  }
});

// Listen for messages from background (transaction results)
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received from background:', message);

  if (message.type && isSphereResponse(message.type)) {
    // Forward to page
    window.postMessage(message, '*');
  }

  sendResponse({ received: true });
  return true;
});

export {};
