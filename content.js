if (!window.__postGenieLoaded) {
  window.__postGenieLoaded = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitFor = async (fn, timeout = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const result = fn();
      if (result) return result;
      await sleep(250);
    }
    return null;
  };

  const isVisible = (el) => !!el && el.getClientRects().length > 0;

  const findEditor = () => {
    const selectors = [
      '[role="dialog"] .ql-editor[contenteditable="true"]',
      '[role="dialog"] [role="textbox"][contenteditable="true"]',
      '.share-creation-state__text-editor [contenteditable="true"]',
      '.ql-editor[contenteditable="true"]',
    ];
    for (const sel of selectors) {
      const el = Array.from(document.querySelectorAll(sel)).find(isVisible);
      if (el) return el;
    }
    return null;
  };

  const findStartPostButton = () => {
    const direct = document.querySelector(".share-box-feed-entry__trigger");
    if (isVisible(direct)) return direct;
    return Array.from(document.querySelectorAll('button, [role="button"]')).find(
      (b) =>
        isVisible(b) &&
        (/start a post/i.test(b.textContent || "") || /start a post/i.test(b.getAttribute("aria-label") || ""))
    );
  };

  const insertText = async (editor, text) => {
    editor.focus();
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    await sleep(400);
    if (!editor.textContent.trim()) {
      editor.focus();
      document.execCommand("insertText", false, text);
      await sleep(200);
    }
    return !!editor.textContent.trim();
  };

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "POST_GENIE_INSERT") return;
    (async () => {
      let editor = findEditor();
      if (!editor) {
        const trigger = await waitFor(findStartPostButton, 8000);
        if (!trigger) return { ok: false, code: "NO_TRIGGER", error: "Couldn't find LinkedIn's \"Start a post\" button." };
        trigger.click();
        editor = await waitFor(findEditor, 8000);
      }
      if (!editor) return { ok: false, error: "LinkedIn's post composer didn't open." };
      const ok = await insertText(editor, msg.text);
      return ok ? { ok: true } : { ok: false, error: "Couldn't type into LinkedIn's composer." };
    })()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  });
}
