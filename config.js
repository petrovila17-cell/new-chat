window.PACKNOTE_CONFIG = {
  /*
   * Replace this with the public Payment Link URL from Stripe Dashboard.
   * Example: "https://buy.stripe.com/test_xxxxxxxxxxxxx"
   */
  stripePaymentLinkUrl: "",

  /*
   * This same-origin endpoint securely verifies a returned Stripe Checkout
   * Session. It is provided by the Netlify function in this project.
   */
  verifySessionEndpoint: "/.netlify/functions/verify-stripe-session"
};
