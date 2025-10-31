// background.js

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "promptify-refine",
    title: "Refine with Promptify",
    contexts: ["selection"]
  });
});

// In background.js (append)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.type === "PROMPTIFY_REFINED") {
    const refined = msg.refined;
    chrome.storage.local.set({ lastRefined: refined }, () => {
      console.log("Promptify: saved lastRefined");
    });
  }
});

// Handle clicks on the context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "promptify-refine" || !info.selectionText) return;

  try {
    // Execute the refine function inside the page context
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selectedText) => {
        // This function runs in page context
        // Provide a small mock if ai is not present (dev fallback)
        if (typeof ai === "undefined") {
          globalThis.ai = {
            languageModel: {
              async capabilities() {
                return { available: "mock" };
              },
              async create() {
                return {
                  prompt: async (s) => {
                    await new Promise((r) => setTimeout(r, 300));
                    return `✨ [Mocked Rewrite]\n\n${s}\n\n🧠 Refined by Promptify.`;
                  }
                };
              }
            }
          };
        }

        // Actual in-page refinement
        (async () => {
          try {
            const session = await ai.languageModel.create({
              systemPrompt:
                "You are Promptify. Rewrite the given text for clarity and creativity."
            });
            const refined = await session.prompt(
              `Rewrite this text for clarity and creativity:\n\n${selectedText}`
            );

            // Replace the selection on the page
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(refined));
            }

            // Try copying to clipboard (best-effort)
            try {
              navigator.clipboard.writeText(refined).catch(() => {});
            } catch (e) {}

            // Send refined text back to extension background via custom event
            window.dispatchEvent(
              new CustomEvent("promptify_refined", { detail: { refined } })
            );

            // Optional small UI feedback
            alert("✅ Refined by Promptify (also copied to clipboard).");
          } catch (err) {
            console.error("Promptify (in-page) error:", err);
            alert("Promptify failed to refine the selection. See console.");
          }
        })();
      },
      args: [info.selectionText]
    });

    // Listen for the event from the page and store last refined
    // (we can't attach a persistent listener here in background for each page event,
    //  so we also inject a short helper that posts a message to the extension)
    // Instead we also inject a tiny helper to forward the custom event to the extension runtime:
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (!window.__promptifyForwarderAdded) {
          window.__promptifyForwarderAdded = true;
          window.addEventListener("promptify_refined", (ev) => {
            // Post to extension - this becomes visible to runtime.onMessage in background if set
            window.postMessage({ type: "PROMPTIFY_REFINED", refined: ev.detail.refined }, "*");
          });
        }
      }
    });

    // Setup a one-time listener in the background to receive the page postMessage via runtime.onMessage
    // (Note: content scripts receive window.postMessage; background can't directly. We'll add a short content script listener below.)
  } catch (err) {
    console.error("Promptify background error:", err);
  }
});
