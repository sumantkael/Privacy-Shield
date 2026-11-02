/**
 * Privacy Shield - Safe DOM Reconciliation Guard
 * Installed in the MAIN world to protect React, Next.js, Vue, and Angular frameworks
 * from DOMException: 'Failed to execute removeChild on Node'.
 */
(function installPrivacyShieldGuard() {
  if (typeof window === 'undefined' || window.__PRIVACY_SHIELD_GUARD__) return;
  window.__PRIVACY_SHIELD_GUARD__ = true;

  try {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      if (!child) return null;
      // If the node being removed has already been moved, wrapped, or detached by an extension
      if (child.parentNode !== this) {
        if (child.parentNode) {
          try {
            return child.parentNode.removeChild(child);
          } catch (e) {
            return child;
          }
        }
        // Node is already detached from DOM; safely return without crashing the framework
        return child;
      }
      return originalRemoveChild.call(this, child);
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (!newNode) return null;
      // If referenceNode is missing or detached from this parent, fallback to appendChild
      if (referenceNode && referenceNode.parentNode !== this) {
        return this.appendChild(newNode);
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    };
  } catch (err) {
    // Fail silently without disrupting page execution
  }
})();
