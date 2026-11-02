/**
 * Privacy Shield - Dynamic DOM Mutation Observer
 * Synchronous pre-paint microtask processing for true zero-frame leak prevention.
 */

export class DomObserver {
  constructor(scanner) {
    this.scanner = scanner;
    this.observer = null;
    this.isPaused = false;

    this.nonTextTags = new Set([
      'SVG', 'PATH', 'CANVAS', 'IMG', 'PICTURE',
      'VIDEO', 'AUDIO', 'STYLE', 'SCRIPT', 'LINK',
      'SOURCE', 'TRACK'
    ]);
  }

  start() {
    const root = document.documentElement || document.body;
    if (this.observer || !root) return;

    this.observer = new MutationObserver((mutations) => {
      if (this.isPaused) return;

      for (let m = 0; m < mutations.length; m++) {
        const mutation = mutations[m];

        // Ignore mutations triggered by Privacy Shield elements
        if (mutation.target instanceof Element) {
          if (mutation.target.closest('.ps-shield-blur') || 
              mutation.target.closest('.ps-pin-btn') ||
              mutation.target.classList.contains('ps-shield-input')) {
            continue;
          }
        }

        // Added Nodes
        if (mutation.type === 'childList') {
          const elementsToScan = [];
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName;
              if (this.nonTextTags.has(tag)) continue;
              if (node.classList && (node.classList.contains('ps-shield-blur') || node.classList.contains('ps-pin-btn'))) {
                continue;
              }
              elementsToScan.push(node);
            } else if (node.nodeType === Node.TEXT_NODE) {
              if (node.parentElement && !node.parentElement.closest('.ps-shield-blur')) {
                const text = node.nodeValue;
                if (text && text.trim().length >= 3) {
                  const matches = this.scanner.detector.detectInText(text);
                  if (matches.length > 0) {
                    this.pause();
                    try {
                      this.scanner.blurManager.blurTextNode(node, matches);
                    } finally {
                      this.resume();
                    }
                  }
                }
              }
            }
          }

          if (elementsToScan.length > 0) {
            this.pause();
            try {
              for (const el of elementsToScan) {
                if (el.isConnected) {
                  this.scanner.scanSubtree(el);
                }
              }
            } finally {
              this.resume();
            }
          }
        }

        // Character Data Changes (e.g. React updating textNode.nodeValue)
        if (mutation.type === 'characterData') {
          const node = mutation.target;
          if (node && node.nodeType === Node.TEXT_NODE && node.parentElement && !node.parentElement.closest('.ps-shield-blur')) {
            const text = node.nodeValue;
            if (text && text.trim().length >= 3) {
              const matches = this.scanner.detector.detectInText(text);
              if (matches.length > 0) {
                this.pause();
                try {
                  this.scanner.blurManager.blurTextNode(node, matches);
                } finally {
                  this.resume();
                }
              }
            }
          }
        }
      }
    });

    this.observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }
}
