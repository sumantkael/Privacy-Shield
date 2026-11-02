/**
 * Privacy Shield - Shadow DOM Support
 * Traverses open shadow roots in Web Components for sensitive content.
 */

export class ShadowDomHandler {
  constructor(scanner) {
    this.scanner = scanner;
  }

  scanShadowRoots(root = document) {
    if (!root) return;
    const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];

    allElements.forEach(el => {
      if (el.shadowRoot) {
        this.scanner.scanSubtree(el.shadowRoot);
        // Recursively inspect nested shadow roots
        this.scanShadowRoots(el.shadowRoot);
      }
    });
  }
}
