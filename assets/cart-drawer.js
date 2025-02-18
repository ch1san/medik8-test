class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
    this.initUpsell();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    if (!cartLink) return;

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty') ? this.querySelector('.drawer__inner-empty') : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  initUpsell() {
    // Get the container for upsell products
    const upsellContainer = this.querySelector('.cart-drawer-upsell');
    if (!upsellContainer) return;

    // Get the URL for fetching product recommendations from the container's data attribute
    const productRecommendationsUrl = upsellContainer.dataset.url;
    if (!productRecommendationsUrl) return;

    this.loadUpsellProducts(productRecommendationsUrl);
  }

  async loadUpsellProducts(url) {
    try {
      // Get configuration options from data attributes
      const priceSorting = this.querySelector('.cart-drawer-upsell').dataset.upsellPricing;
      const useLastItemAdded = this.querySelector('.cart-drawer-upsell').dataset.upsellTargetItem;
      let cartItems = [];

      // Determine which cart items to use for recommendations
      if (useLastItemAdded === 'true') {
        // Only use the most recently added item
        cartItems.push(this.querySelectorAll('.cart-item')[0].dataset.productId);
      } else {
        // Use all items in cart
        cartItems = Array.from(this.querySelectorAll('.cart-item')).map((item) => {
          const productId = item.dataset.productId;
          return productId;
        });
      }

      // Create a Set for efficient lookup of cart items
      const cartItemIds = new Set(cartItems);
      const upsellCount = this.querySelector('.cart-drawer-upsell').dataset.upsellCount;

      // Fetch recommendations for each cart item in parallel
      const recommendationsPromises = Array.from(cartItemIds).map((productId) =>
        fetch(`${url}?section_id=cart-drawer&product_id=${productId}&limit=10`)
          .then((response) => response.text())
          .then((text) => {
            const html = new DOMParser().parseFromString(text, 'text/html');
            const products = Array.from(html.querySelectorAll('.cart-drawer-upsell__item'));

            return products.map((product) => {
              return {
                id: product.querySelector('.card-wrapper').dataset.productId,
                element: product,
              };
            });
          })
      );

      // Wait for all recommendation requests to complete
      const allRecommendations = await Promise.all(recommendationsPromises);

      // Process recommendations:
      // 1. Flatten the array of arrays
      // 2. Remove products that are already in cart
      // 3. Remove duplicate recommendations
      // 4. Sort by price according to priceSorting setting
      const uniqueRecommendations = allRecommendations
        .flat()
        .filter((rec) => !cartItemIds.has(rec.id))
        .reduce((unique, rec) => {
          if (!unique.some((item) => item.id === rec.id)) {
            unique.push(rec);
          }
          return unique;
        }, [])
        .sort((a, b) => {
          const priceA = parseFloat(a.element.querySelector('[data-price]')?.dataset.price || 0);
          const priceB = parseFloat(b.element.querySelector('[data-price]')?.dataset.price || 0);

          if (priceSorting === 'highest_price') {
            return priceB - priceA;
          } else {
            return priceA - priceB;
          }
        });

      const upsellContainer = this.querySelector('.cart-drawer-upsell');
      const upsellList = upsellContainer.querySelector('.cart-drawer-upsell__list');

      // Display recommendations if any exist
      if (uniqueRecommendations.length > 0) {
        upsellList.innerHTML = '';
        // Only show the number of recommendations specified by upsellCount
        uniqueRecommendations.slice(0, upsellCount).forEach((rec) => {
          const li = document.createElement('li');
          li.className = 'cart-drawer-upsell__item';
          li.innerHTML = rec.element.innerHTML;
          upsellList.appendChild(li);
        });

        upsellContainer.style.display = 'block';
      } else {
        upsellContainer.style.display = 'none';
      }
    } catch (e) {
      console.error('Error loading product recommendations:', e);
    }
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') && this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector ? document.querySelector(section.selector) : document.getElementById(section.id);

      if (!sectionElement) return;
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    this.initUpsell();

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
