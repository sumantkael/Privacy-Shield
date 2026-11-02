(() => {
  // src/content/page-guard.js
  (function installPrivacyShieldGuard() {
    if (typeof window === "undefined" || window.__PRIVACY_SHIELD_GUARD__) return;
    window.__PRIVACY_SHIELD_GUARD__ = true;
    try {
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function(child) {
        if (!child) return null;
        if (child.parentNode !== this) {
          if (child.parentNode) {
            try {
              return child.parentNode.removeChild(child);
            } catch (e) {
              return child;
            }
          }
          return child;
        }
        return originalRemoveChild.call(this, child);
      };
      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function(newNode, referenceNode) {
        if (!newNode) return null;
        if (referenceNode && referenceNode.parentNode !== this) {
          return this.appendChild(newNode);
        }
        return originalInsertBefore.call(this, newNode, referenceNode);
      };
    } catch (err) {
    }
  })();
})();
