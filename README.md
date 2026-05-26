# PackNote Studio

A no-account MVP for handmade sellers to create printable packaging inserts:

- thank-you cards;
- care instruction cards;
- review request cards;
- QR link to a shop or social profile;
- free preview, high-resolution PNG and letter-sized print export with a watermark;
- Stripe-verified premium export without the watermark.

Everything is generated locally in the browser. There is no database or upload step.

## Run locally

Open `index.html` directly in a browser, or serve the directory:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`. The app is static and can be deployed to
GitHub Pages, Netlify or Cloudflare Pages.

## Verify export tiers

```powershell
node .\tests\smoke.js
node .\tests\verify-stripe-session.js
```

The tests confirm that the unpaid preview and free files receive the PackNote
watermark, while clean preview and files unlock only after a paid Stripe
Checkout Session passes server-side verification.

## Connect Stripe Payment Links

The premium flow is implemented for a Netlify deployment. Stripe hosts the
checkout page and returns the buyer to PackNote with a Checkout Session ID.
The Netlify function verifies that payment before enabling clean exports.

1. In Stripe Dashboard, create a one-time product named `PackNote Premium Export`
   with a fixed price of `$5.00 USD`.
2. Create a Payment Link for that product. For the first release, keep Adaptive
   Pricing disabled because the verification function expects the fixed USD amount.
3. Under the Payment Link's **After payment** settings, choose redirect and set:

   ```text
   https://YOUR-DOMAIN.example/?session_id={CHECKOUT_SESSION_ID}#editor
   ```

4. Copy the public `https://buy.stripe.com/...` Payment Link into
   `stripePaymentLinkUrl` in `config.js`.
5. Deploy on Netlify and set these environment variables using `.env.example`:

   ```text
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PAYMENT_LINK_ID=plink_...
   PACKNOTE_PRICE_AMOUNT_CENTS=500
   PACKNOTE_PRICE_CURRENCY=usd
   ```

Use test-mode values (`sk_test_...` and a test Payment Link) before switching
the site to live payments. The secret key belongs only in Netlify environment
variables, never in `config.js`.

### Current entitlement model

This initial paid version has no accounts or database. After Stripe confirms
payment, premium export stays unlocked in the customer's current browser tab
session. A later production iteration should add durable purchase recovery
through an account or emailed entitlement, plus a Stripe webhook-backed order
record.

## MVP monetization path

1. Publish the free editor with a branded export watermark.
2. Configure the Stripe Payment Link and Netlify environment variables.
3. Sell watermark-free exports or premium template packs as paid downloads.
4. Create landing pages for specific searches such as `etsy thank you card maker`,
   `candle care card template` and `jewelry care insert`.
5. Add saved brand kits only after there is repeat use.

## Product constraints

- No marketplace integrations.
- No storage of shop or customer information.
- QR encoder supports short destination links suitable for shop pages and profiles.
