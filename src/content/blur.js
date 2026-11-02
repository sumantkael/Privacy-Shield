/**
 * Privacy Shield - Blur & Visual Protection System
 * Wraps sensitive text nodes and protects input elements using non-destructive CSS styling.
 */

export class BlurManager {
  constructor(options = {}) {
    this.blurRadius = options.blurRadius || 6;
    this.blurredElements = new Set();
    this.counterCallback = options.onCountChanged || null;
  }

  setBlurRadius(radius) {
    this.blurRadius = radius;
    document.documentElement.style.setProperty('--ps-blur-radius', `${radius}px`);
  }

  /**
   * Blurs sensitive matches inside a single DOM Text node
   */
  blurTextNode(textNode, matches) {
    if (!textNode || !textNode.parentNode || matches.length === 0) return 0;

    const parent = textNode.parentNode;
    // Don't blur inside already protected wrappers or input elements
    if (parent.closest('.ps-shield-blur') || parent.closest('.ps-shield-input')) {
      return 0;
    }

    // Skip scripts, styles, contenteditable
    if (parent.isContentEditable || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) {
      return 0;
    }

    const fullText = textNode.nodeValue || '';
    if (!fullText.trim()) return 0;

    // PATTERN 1: Safe Non-Destructive Parent-Level Blurring
    // If the text node is the primary or sole content of the parent element
    // (e.g. <span>email</span>, <td>key</td>, <code>token</code>, <a>phone</a>, <p>card</p>)
    // We blur the parent element directly! This NEVER alters child text nodes,
    // guaranteeing 100% compatibility with React, Vue, Next.js, and SSR hydration!
    const isSingleChild = parent.childNodes.length === 1;
    const isSoleText = parent.textContent.trim().length <= matches[0].matchedText.trim().length + 10;

    if (matches.length === 1 && (isSingleChild || isSoleText) && parent !== document.body && parent !== document.documentElement) {
      parent.classList.add('ps-shield-blur');
      parent.setAttribute('data-ps-cat', matches[0].category);
      parent.setAttribute('data-ps-badge', matches[0].badge || matches[0].category);
      parent.setAttribute('tabindex', '0');
      parent.setAttribute('role', 'button');
      parent.setAttribute('aria-label', `Protected ${matches[0].badge || 'sensitive content'}. Press Enter to reveal.`);
      this.blurredElements.add(parent);
      this.notifyCountChanged();
      return 1;
    }

    // PATTERN 2: Inline <mark> wrapping for mixed-text sentences
    // (e.g. "Your verification code is 123456 in your account")
    try {
      const fragment = document.createDocumentFragment();
      let currentIdx = 0;
      let createdCount = 0;

      for (const match of matches) {
        if (match.start > currentIdx) {
          fragment.appendChild(document.createTextNode(fullText.substring(currentIdx, match.start)));
        }

        const sensitiveText = fullText.substring(match.start, match.end);
        const blurSpan = document.createElement('mark');
        blurSpan.className = 'ps-shield-blur';
        blurSpan.setAttribute('data-ps-cat', match.category);
        blurSpan.setAttribute('data-ps-badge', match.badge || match.category);
        blurSpan.setAttribute('tabindex', '0');
        blurSpan.setAttribute('role', 'button');
        blurSpan.setAttribute('aria-label', `Protected ${match.badge || 'sensitive content'}. Press Enter to reveal.`);
        blurSpan.textContent = sensitiveText;

        fragment.appendChild(blurSpan);
        this.blurredElements.add(blurSpan);
        createdCount++;

        currentIdx = match.end;
      }

      if (currentIdx < fullText.length) {
        fragment.appendChild(document.createTextNode(fullText.substring(currentIdx)));
      }

      parent.replaceChild(fragment, textNode);
      this.notifyCountChanged();
      return createdCount;
    } catch (err) {
      // In case parent was unmounted or modified concurrently, fail gracefully without throwing
      return 0;
    }
  }

  /**
   * Blurs sensitive input element (e.g. password, credit card, ssn)
   * Non-destructive: does not modify .value
   */
  blurInput(inputEl, info) {
    if (!inputEl || this.blurredElements.has(inputEl)) return false;

    inputEl.classList.add('ps-shield-input');
    inputEl.setAttribute('data-ps-cat', info.category);
    inputEl.setAttribute('data-ps-badge', info.badge);
    inputEl.setAttribute('aria-label', `Privacy Shield: protected ${info.badge}`);

    this.blurredElements.add(inputEl);
    this.notifyCountChanged();
    return true;
  }

  /**
   * Restores a blurred text element back to plain text
   */
  unblurTextElement(blurSpan) {
    if (!blurSpan) return;
    if (blurSpan.tagName === 'MARK') {
      if (blurSpan.parentNode) {
        try {
          const textNode = document.createTextNode(blurSpan.textContent);
          blurSpan.parentNode.replaceChild(textNode, blurSpan);
        } catch (e) {}
      }
    } else {
      blurSpan.classList.remove('ps-shield-blur', 'ps-revealed', 'ps-pinned');
      blurSpan.removeAttribute('data-ps-cat');
      blurSpan.removeAttribute('data-ps-badge');
      const pinBtn = blurSpan.querySelector('.ps-pin-btn');
      if (pinBtn) pinBtn.remove();
    }
    this.blurredElements.delete(blurSpan);
  }

  /**
   * Restores an input element
   */
  unblurInput(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('ps-shield-input', 'ps-revealed', 'ps-pinned');
    inputEl.removeAttribute('data-ps-cat');
    inputEl.removeAttribute('data-ps-badge');
    this.blurredElements.delete(inputEl);
  }

  /**
   * Removes all Privacy Shield blur effects and wrappers across the entire document
   */
  clearAll() {
    // 1. Text wrappers
    const textSpans = document.querySelectorAll('.ps-shield-blur');
    textSpans.forEach(span => this.unblurTextElement(span));

    // 2. Input elements
    const inputs = document.querySelectorAll('.ps-shield-input');
    inputs.forEach(input => this.unblurInput(input));

    this.blurredElements.clear();
    this.notifyCountChanged();
  }

  /**
   * Returns total count of currently protected elements
   */
  getCount() {
    // Filter out disconnected elements
    for (const el of this.blurredElements) {
      if (!el.isConnected) {
        this.blurredElements.delete(el);
      }
    }
    return this.blurredElements.size;
  }

  notifyCountChanged() {
    if (typeof this.counterCallback === 'function') {
      this.counterCallback(this.getCount());
    }
  }
}
