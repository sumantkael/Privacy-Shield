/**
 * Privacy Shield - Reveal & Interaction Manager
 * Controls click-to-reveal, hover-to-reveal, auto-reblur countdowns, and keyboard accessibility.
 */

export class RevealManager {
  constructor(options = {}) {
    this.revealOnHover = options.revealOnHover || false;
    this.revealOnClick = options.revealOnClick !== false;
    this.reblurTimeout = options.reblurTimeout || 4000;
    this.allowPinReveal = options.allowPinReveal !== false;

    // Track active timers per element
    this.reblurTimers = new WeakMap();

    // Bound listeners for clean attachment
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.attachGlobalListeners();
  }

  updateConfig(config = {}) {
    if (typeof config.revealOnHover === 'boolean') this.revealOnHover = config.revealOnHover;
    if (typeof config.revealOnClick === 'boolean') this.revealOnClick = config.revealOnClick;
    if (typeof config.reblurTimeout === 'number') this.reblurTimeout = config.reblurTimeout;
    if (typeof config.allowPinReveal === 'boolean') this.allowPinReveal = config.allowPinReveal;
  }

  attachGlobalListeners() {
    // Delegated event listening on document root for high performance
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('mouseover', this.handleMouseEnter, true);
    document.addEventListener('mouseout', this.handleMouseLeave, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  detachGlobalListeners() {
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('mouseover', this.handleMouseEnter, true);
    document.removeEventListener('mouseout', this.handleMouseLeave, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  getShieldTarget(eventTarget) {
    if (!eventTarget || !(eventTarget instanceof Element)) return null;
    return eventTarget.closest('.ps-shield-blur, .ps-shield-input');
  }

  handleClick(e) {
    const target = this.getShieldTarget(e.target);
    if (!target) return;

    // If target has a pin button clicked
    if (e.target.closest('.ps-pin-btn')) {
      e.preventDefault();
      e.stopPropagation();
      this.togglePin(target);
      return;
    }

    if (!this.revealOnClick) return;

    // Toggle reveal state
    if (target.classList.contains('ps-revealed')) {
      if (!target.classList.contains('ps-pinned')) {
        this.reblur(target);
      }
    } else {
      this.reveal(target);
    }
  }

  handleMouseEnter(e) {
    if (!this.revealOnHover) return;
    const target = this.getShieldTarget(e.target);
    if (!target) return;

    // Clear any pending re-blur timer
    this.clearTimer(target);
    this.reveal(target);
  }

  handleMouseLeave(e) {
    const target = this.getShieldTarget(e.target);
    if (!target) return;

    // Do not re-blur if item is pinned
    if (target.classList.contains('ps-pinned')) return;

    // If hover reveal is active or item was revealed, start reblur timer
    if (target.classList.contains('ps-revealed')) {
      this.scheduleReblur(target);
    }
  }

  handleKeyDown(e) {
    // Escape key re-blurs all unpinned revealed items
    if (e.key === 'Escape') {
      const revealed = document.querySelectorAll('.ps-revealed:not(.ps-pinned)');
      revealed.forEach(el => this.reblur(el));
      return;
    }

    const target = this.getShieldTarget(document.activeElement);
    if (!target) return;

    // Enter or Space toggles reveal
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (target.classList.contains('ps-revealed')) {
        this.reblur(target);
      } else {
        this.reveal(target);
      }
    }

    // 'p' or 'P' toggles pin lock
    if ((e.key === 'p' || e.key === 'P') && this.allowPinReveal) {
      e.preventDefault();
      this.togglePin(target);
    }
  }

  reveal(el) {
    if (!el) return;
    this.clearTimer(el);
    el.classList.add('ps-revealed');
    el.setAttribute('aria-expanded', 'true');

    // Create Apple-style high-contrast pin button if not exists
    if (this.allowPinReveal && !el.querySelector('.ps-pin-btn') && el.classList.contains('ps-shield-blur')) {
      const isPinned = el.classList.contains('ps-pinned');
      const pinBtn = document.createElement('button');
      pinBtn.className = 'ps-pin-btn' + (isPinned ? ' active' : '');
      pinBtn.title = isPinned ? 'Pinned (Click to unpin)' : 'Keep revealed (Pin)';
      pinBtn.setAttribute('aria-label', 'Pin revealed');
      pinBtn.setAttribute('tabindex', '-1');
      pinBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" style="display:block!important;width:12px!important;height:12px!important;margin:auto!important;pointer-events:none!important;overflow:visible!important;">
          <path d="M16 3H8C7.45 3 7 3.45 7 4V6C7 7.1 6.55 8.15 5.76 8.94L4.29 10.41C4.04 10.66 4.18 11 4.54 11H10V18L12 21L14 18V11H19.46C19.82 11 19.96 10.66 19.71 10.41L18.24 8.94C17.45 8.15 17 7.1 17 6V4C17 3.45 16.55 3 16 3Z" fill="#FFFFFF" style="fill:#FFFFFF!important;stroke:none!important;opacity:1!important;visibility:visible!important;"></path>
        </svg>
      `;
      el.appendChild(pinBtn);
    }

    this.scheduleReblur(el);
  }

  reblur(el) {
    if (!el) return;
    this.clearTimer(el);
    el.classList.remove('ps-revealed', 'ps-pinned');
    el.setAttribute('aria-expanded', 'false');

    const pinBtn = el.querySelector('.ps-pin-btn');
    if (pinBtn) pinBtn.remove();
  }

  togglePin(el) {
    if (!el) return;
    const pinBtn = el.querySelector('.ps-pin-btn');
    if (el.classList.contains('ps-pinned')) {
      el.classList.remove('ps-pinned');
      if (pinBtn) {
        pinBtn.classList.remove('active');
        pinBtn.title = 'Keep revealed (Pin)';
      }
      this.scheduleReblur(el);
    } else {
      this.clearTimer(el);
      el.classList.add('ps-revealed', 'ps-pinned');
      if (pinBtn) {
        pinBtn.classList.add('active');
        pinBtn.title = 'Pinned (Click to unpin)';
      }
    }
  }

  scheduleReblur(el) {
    if (!el || el.classList.contains('ps-pinned')) return;
    this.clearTimer(el);

    if (this.reblurTimeout > 0) {
      const timer = setTimeout(() => {
        // Only re-blur if not currently hovered or focused
        if (!el.matches(':hover') && document.activeElement !== el && !el.classList.contains('ps-pinned')) {
          this.reblur(el);
        }
      }, this.reblurTimeout);

      this.reblurTimers.set(el, timer);
    }
  }

  clearTimer(el) {
    if (this.reblurTimers.has(el)) {
      clearTimeout(this.reblurTimers.get(el));
      this.reblurTimers.delete(el);
    }
  }
}
