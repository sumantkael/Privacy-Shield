/**
 * Privacy Shield - DOM Scanner
 * High-performance incremental scanner using TreeWalker.
 */

export class DomScanner {
  constructor(detector, blurManager) {
    this.detector = detector;
    this.blurManager = blurManager;
    this.ignoredTags = new Set([
      'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS',
      'TEMPLATE', 'HEAD', 'META', 'LINK',
      'AUDIO', 'VIDEO', 'OBJECT', 'EMBED'
    ]);
  }

  /**
   * Scans a subtree starting from a root node
   */
  scanSubtree(rootNode = document.body) {
    if (!rootNode || !rootNode.isConnected) return;
    if (this.ignoredTags.has(rootNode.nodeName)) return;

    // 1. Scan input and textarea elements within the subtree
    this.scanInputs(rootNode);

    // 2. Scan text nodes using TreeWalker
    this.scanTextNodes(rootNode);

    // 3. Scan same-origin iframes
    this.scanSameOriginIframes(rootNode);
  }

  scanInputs(rootNode) {
    if (rootNode instanceof HTMLElement && (rootNode.tagName === 'INPUT' || rootNode.tagName === 'TEXTAREA')) {
      this.checkAndBlurInput(rootNode);
      return;
    }

    if (!rootNode.querySelectorAll) return;

    const inputs = rootNode.querySelectorAll('input, textarea');
    inputs.forEach(el => this.checkAndBlurInput(el));
  }

  checkAndBlurInput(inputEl) {
    if (inputEl.classList.contains('ps-shield-input')) return;
    const sensitiveInfo = this.detector.detectSensitiveInput(inputEl);
    if (sensitiveInfo) {
      this.blurManager.blurInput(inputEl, sensitiveInfo);
    }
  }

  scanTextNodes(rootNode) {
    const walker = document.createTreeWalker(
      rootNode,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Skip ignored tags
          if (this.ignoredTags.has(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip already blurred nodes or input wrappers
          if (parent.closest('.ps-shield-blur') || parent.closest('.ps-shield-input')) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip active contenteditable and live interactive code editors (Monaco, Ace, CodeMirror)
          if (parent.isContentEditable || parent.closest('.monaco-editor, .ace_editor, .cm-editor, [contenteditable="true"]')) {
            return NodeFilter.FILTER_REJECT;
          }

          const val = node.nodeValue;
          if (!val || val.trim().length < 3) {
            return NodeFilter.FILTER_SKIP;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToProcess = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      nodesToProcess.push(currentNode);
      currentNode = walker.nextNode();
    }

    // Process collected text nodes
    for (const textNode of nodesToProcess) {
      if (!textNode.isConnected) continue;
      const text = textNode.nodeValue;
      const matches = this.detector.detectInText(text);

      if (matches.length > 0) {
        this.blurManager.blurTextNode(textNode, matches);
      }
    }
  }

  scanSameOriginIframes(rootNode) {
    if (!rootNode.querySelectorAll) return;
    const iframes = rootNode.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument && iframe.contentDocument.body) {
          this.scanSubtree(iframe.contentDocument.body);
        }
      } catch (e) {
        // Cross-origin iframes are managed directly by WebExtension all_frames runner
      }
    });
  }
}
