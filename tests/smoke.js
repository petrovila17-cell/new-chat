"use strict";

var assert = require("node:assert/strict");

function ClassList(initial) {
  this.values = new Set(initial || []);
}
ClassList.prototype.add = function (name) {
  this.values.add(name);
};
ClassList.prototype.remove = function (name) {
  this.values.delete(name);
};
ClassList.prototype.contains = function (name) {
  return this.values.has(name);
};
ClassList.prototype.toggle = function (name, force) {
  if (force === undefined ? !this.contains(name) : force) {
    this.add(name);
  } else {
    this.remove(name);
  }
};

function Element(id, value) {
  this.id = id;
  this.value = value || "";
  this.textContent = "";
  this.dataset = {};
  this.disabled = false;
  this.classList = new ClassList();
  this.listeners = {};
  this.children = [];
}
Element.prototype.addEventListener = function (name, listener) {
  this.listeners[name] = listener;
};
Element.prototype.focus = function () {};
Element.prototype.appendChild = function (child) {
  this.children.push(child);
};
Element.prototype.click = function () {
  if (this.listeners.click) {
    this.listeners.click({ target: this });
  }
};

var calls = [];
var exports = [];
var context = new Proxy({
  fillText: function (text) {
    calls.push(text);
  },
  measureText: function (text) {
    return { width: text.length * 12 };
  }
}, {
  get: function (target, key) {
    return target[key] || function () {};
  },
  set: function (target, key, value) {
    target[key] = value;
    return true;
  }
});

var values = {
  "shop-name": "Stone & Cedar",
  social: "@stoneandcedar",
  headline: "Thank you for your order",
  message: "Packed with care.",
  "offer-label": "NEXT ORDER",
  "promo-code": "THANKYOU10",
  destination: "https://etsy.me/stoneandcedar",
  theme: "linen",
  "card-size": "business",
  accent: "#bb7450"
};
var ids = [
  "shop-name", "social", "headline", "message", "offer-label", "promo-code",
  "destination", "theme", "card-size", "accent", "qr-status", "premium-modal",
  "premium-plan", "unlock-premium", "premium-actions", "preview-status",
  "checkout-status",
  "download-free-png", "print-free-sheet", "download-premium-png",
  "print-premium-sheet", "close-premium", "start-stripe-checkout",
  "reset-template", "print-area"
];
var elements = {};
ids.forEach(function (id) {
  elements[id] = new Element(id, values[id]);
});
elements["premium-modal"].classList.add("is-hidden");
elements["premium-actions"].classList.add("is-hidden");
elements["preview-status"].textContent = "Free watermarked preview";

var canvas = new Element("card-preview");
canvas.getContext = function () {
  return context;
};
canvas.toDataURL = function () {
  exports.push(calls.slice());
  return "data:image/png;base64,test";
};
elements["card-preview"] = canvas;

var chips = ["thanks", "care", "review"].map(function (type) {
  var chip = new Element(type);
  chip.dataset.type = type;
  if (type === "thanks") {
    chip.classList.add("is-selected");
  }
  return chip;
});

global.window = global;
global.PACKNOTE_CONFIG = {
  stripePaymentLinkUrl: "https://buy.stripe.com/test_packnote",
  verifySessionEndpoint: "/.netlify/functions/verify-stripe-session"
};
function storage() {
  var entries = {};
  return {
    getItem: function (key) { return entries[key] || null; },
    setItem: function (key, value) { entries[key] = String(value); },
    removeItem: function (key) { delete entries[key]; }
  };
}
global.localStorage = storage();
global.sessionStorage = storage();
global.location = {
  hash: "#editor",
  pathname: "/",
  search: "?session_id=cs_test_paid123",
  assign: function (url) { global.assignedCheckout = url; }
};
global.history = {
  replaceState: function () { global.removedCheckoutQuery = true; }
};
global.fetch = async function (url) {
  global.verifiedUrl = url;
  return {
    ok: true,
    json: async function () { return { paid: true }; }
  };
};
global.document = {
  addEventListener: function () {},
  createElement: function (name) {
    if (name === "a") {
      var anchor = new Element("download");
      anchor.click = function () {
        global.lastDownload = anchor.download;
      };
      return anchor;
    }
    return new Element(name);
  },
  getElementById: function (id) {
    return elements[id];
  },
  querySelectorAll: function (selector) {
    return selector === ".chip" ? chips : [];
  }
};
global.Image = function () {
  return new Element("image");
};
global.print = function () {
  global.printInvoked = true;
};

async function run() {
  require("../qr.js");
  require("../app.js");
  assert.equal(elements["preview-status"].textContent, "Free watermarked preview");
  assert.ok(calls.includes("PACKNOTE STUDIO - FREE EXPORT"));
  calls = [];
  await new Promise(function (resolve) { setImmediate(resolve); });

  assert.match(global.verifiedUrl, /session_id=cs_test_paid123/);
  assert.equal(elements["premium-actions"].classList.contains("is-hidden"), false);
  assert.equal(elements["checkout-status"].classList.contains("is-success"), true);
  assert.equal(elements["preview-status"].textContent, "Premium clean preview");
  assert.equal(calls.includes("PACKNOTE STUDIO - FREE EXPORT"), false);
  assert.equal(global.removedCheckoutQuery, true);

  calls = [];
  elements["download-free-png"].click();
  assert.ok(exports.at(-1).includes("PACKNOTE STUDIO - FREE EXPORT"));
  assert.match(global.lastDownload, /-free-insert\.png$/);

  calls = [];
  global.printInvoked = false;
  elements["print-free-sheet"].click();
  assert.equal(global.printInvoked, true);
  assert.ok(exports.at(-1).includes("PACKNOTE STUDIO - FREE EXPORT"));

  calls = [];
  elements["download-premium-png"].click();
  assert.equal(exports.at(-1).includes("PACKNOTE STUDIO - FREE EXPORT"), false);
  assert.match(global.lastDownload, /-premium-insert\.png$/);

  calls = [];
  global.printInvoked = false;
  elements["print-premium-sheet"].click();
  assert.equal(global.printInvoked, true);
  assert.equal(exports.at(-1).includes("PACKNOTE STUDIO - FREE EXPORT"), false);

  elements["start-stripe-checkout"].click();
  assert.equal(global.assignedCheckout, "https://buy.stripe.com/test_packnote");
  assert.ok(global.localStorage.getItem("packnote.draft"));

  console.log("PackNote paid export verification smoke test passed.");
}

run().catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
