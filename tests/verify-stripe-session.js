"use strict";

var assert = require("node:assert/strict");
var verify = require("../netlify/functions/verify-stripe-session.js").handler;

async function run() {
  var originalFetch = global.fetch;
  var originalEnv = {
    key: process.env.STRIPE_SECRET_KEY,
    link: process.env.STRIPE_PAYMENT_LINK_ID,
    amount: process.env.PACKNOTE_PRICE_AMOUNT_CENTS,
    currency: process.env.PACKNOTE_PRICE_CURRENCY
  };
  process.env.STRIPE_SECRET_KEY = "sk_test_private";
  process.env.STRIPE_PAYMENT_LINK_ID = "plink_packnote";
  process.env.PACKNOTE_PRICE_AMOUNT_CENTS = "500";
  process.env.PACKNOTE_PRICE_CURRENCY = "usd";

  global.fetch = async function (url, options) {
    assert.match(url, /cs_test_paid123$/);
    assert.equal(options.headers.Authorization, "Bearer sk_test_private");
    return {
      ok: true,
      json: async function () {
        return {
          payment_status: "paid",
          payment_link: "plink_packnote",
          amount_total: 500,
          currency: "usd"
        };
      }
    };
  };

  var success = await verify({
    httpMethod: "GET",
    queryStringParameters: { session_id: "cs_test_paid123" }
  });
  assert.equal(success.statusCode, 200);
  assert.equal(JSON.parse(success.body).paid, true);

  global.fetch = async function () {
    return {
      ok: true,
      json: async function () {
        return {
          payment_status: "unpaid",
          payment_link: "plink_packnote",
          amount_total: 500,
          currency: "usd"
        };
      }
    };
  };
  var unpaid = await verify({
    httpMethod: "GET",
    queryStringParameters: { session_id: "cs_test_unpaid123" }
  });
  assert.equal(unpaid.statusCode, 403);
  assert.equal(JSON.parse(unpaid.body).paid, false);

  global.fetch = originalFetch;
  if (originalEnv.key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = originalEnv.key;
  if (originalEnv.link === undefined) delete process.env.STRIPE_PAYMENT_LINK_ID; else process.env.STRIPE_PAYMENT_LINK_ID = originalEnv.link;
  if (originalEnv.amount === undefined) delete process.env.PACKNOTE_PRICE_AMOUNT_CENTS; else process.env.PACKNOTE_PRICE_AMOUNT_CENTS = originalEnv.amount;
  if (originalEnv.currency === undefined) delete process.env.PACKNOTE_PRICE_CURRENCY; else process.env.PACKNOTE_PRICE_CURRENCY = originalEnv.currency;
  console.log("Stripe server verification test passed.");
}

run().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
