# Medik8 Test - Dawn Theme Changelog

### Added

- Cart drawer upsell feature
  - Product recommendations based on cart contents
  - Configurable to target last added item or all cart items
  - Price-based sorting (highest/lowest)
  - Auto-refresh on cart updates
  - Responsive design with horizontal scrolling
  - Automatic filtering of products already in cart

### New Settings

- `show_upsell`: Toggle upsell feature in cart drawer
- `upsell_count`: Control number of upsell products shown (1-10)
- `upsell_target_item`: Target last added item or all cart items
- `upsell_pricing`: Sort by highest or lowest price

### New Files

- `snippets/cart-drawer-upsell.liquid`: Upsell feature template
- `assets/cart-drawer-upsell.css`: Upsell styling

### Modified

- `assets/cart-drawer.js`: Added upsell initialization and product loading
- `assets/cart.js`: Added upsell refresh on cart updates
- `assets/component-card.css`: Added upsell styling
- `config/settings_schema.json`: Added upsell settings
- `snippets/card-product.liquid`: Added product id data attribute and upsell card adjustments
- `snippets/cart-drawer.liquid`: Added upsell section
- `snippets/price.liquid`: Added price data attribute
- `locales/en.default.json`: Added upsell translations
- `locales/en.default.schema.json`: Added upsell schema translations

### Technical Details

- Upsells managed in Search & Discovery app
- Uses Shopify's product recommendations API
- Maintains accessibility standards
- Optimized for performance with debounced updates
- Seamless integration with existing cart drawer functionality
