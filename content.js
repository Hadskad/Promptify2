// content.js
window.addEventListener("message", (event) => {
  // We only process messages from our own page context
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.type !== "PROMPTIFY_REFINED") return;

  // Forward to the extension background/runtime
  chrome.runtime.sendMessage({ type: "PROMPTIFY_REFINED", refined: msg.refined });
});
