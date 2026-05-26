"use strict";

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return json(405, { paid: false, error: "Method not allowed." });
  }

  var sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
  if (!sessionId || !/^cs_(test_|live_)[A-Za-z0-9_]+$/.test(sessionId)) {
    return json(400, { paid: false, error: "A valid Checkout Session ID is required." });
  }

  var secretKey = process.env.STRIPE_SECRET_KEY;
  var paymentLinkId = process.env.STRIPE_PAYMENT_LINK_ID;
  var expectedAmount = Number(process.env.PACKNOTE_PRICE_AMOUNT_CENTS || "500");
  var expectedCurrency = (process.env.PACKNOTE_PRICE_CURRENCY || "usd").toLowerCase();

  if (!secretKey || !paymentLinkId) {
    return json(500, { paid: false, error: "Stripe verification is not configured." });
  }

  try {
    var response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sessionId),
      {
        headers: {
          Authorization: "Bearer " + secretKey
        }
      }
    );
    if (!response.ok) {
      return json(400, { paid: false, error: "Stripe could not verify this checkout." });
    }

    var session = await response.json();
    var isExpectedPayment = session.payment_status === "paid" &&
      session.payment_link === paymentLinkId &&
      session.amount_total === expectedAmount &&
      session.currency === expectedCurrency;

    if (!isExpectedPayment) {
      return json(403, { paid: false, error: "No matching paid PackNote export was found." });
    }

    return json(200, { paid: true });
  } catch (error) {
    return json(502, { paid: false, error: "Stripe verification is temporarily unavailable." });
  }
};
