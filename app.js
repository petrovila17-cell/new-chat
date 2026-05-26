(function () {
  "use strict";

  var presets = {
    thanks: {
      headline: "Thank you for your order",
      message: "Your handmade piece was packed with care. We hope it brings a little joy to your day.",
      label: "NEXT ORDER",
      promo: "THANKYOU10"
    },
    care: {
      headline: "Made to last",
      message: "Keep away from water and perfume. Store in a dry place. Wipe gently with a soft cloth.",
      label: "CARE GUIDE",
      promo: "HANDMADE"
    },
    review: {
      headline: "Love your purchase?",
      message: "A small review makes a big difference to an independent shop. Scan to share your experience.",
      label: "THANK YOU",
      promo: "REVIEW"
    }
  };

  var themes = {
    linen: { background: "#fffdf7", text: "#282720", muted: "#746f65", panel: "#f2e8d7" },
    botanical: { background: "#f8faf3", text: "#25352c", muted: "#657068", panel: "#e5ecdd" },
    midnight: { background: "#202b2b", text: "#fffdf7", muted: "#ccd0c9", panel: "#354241" },
    blush: { background: "#fff7f3", text: "#402c2c", muted: "#806d69", panel: "#f5ded8" }
  };

  var config = window.PACKNOTE_CONFIG || {};
  var DRAFT_KEY = "packnote.draft";
  var PAID_SESSION_KEY = "packnote.paidStripeSession";
  var type = "thanks";
  var premiumUnlocked = false;
  var canvas = document.getElementById("card-preview");
  var context = canvas.getContext("2d");
  var fields = {
    shop: document.getElementById("shop-name"),
    social: document.getElementById("social"),
    headline: document.getElementById("headline"),
    message: document.getElementById("message"),
    label: document.getElementById("offer-label"),
    promo: document.getElementById("promo-code"),
    destination: document.getElementById("destination"),
    theme: document.getElementById("theme"),
    size: document.getElementById("card-size"),
    accent: document.getElementById("accent")
  };
  var qrStatus = document.getElementById("qr-status");
  var previewStatus = document.getElementById("preview-status");

  function state() {
    return {
      shop: fields.shop.value.trim() || "Your Shop",
      social: fields.social.value.trim(),
      headline: fields.headline.value.trim() || "Thank you",
      message: fields.message.value.trim(),
      label: fields.label.value.trim(),
      promo: fields.promo.value.trim(),
      destination: fields.destination.value.trim(),
      theme: fields.theme.value,
      size: fields.size.value,
      accent: fields.accent.value
    };
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function textLines(ctx, text, maxWidth) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (word) {
      var candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) {
      lines.push(line);
    }
    return lines;
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) {
      return part.charAt(0);
    }).join("").toUpperCase();
  }

  function renderQr(ctx, value, x, y, size, dark, background) {
    try {
      var matrix = window.createQrMatrix(value || "https://example.com");
      var quiet = 4;
      var cells = matrix.length + quiet * 2;
      var moduleSize = size / cells;
      ctx.fillStyle = background;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = dark;
      matrix.forEach(function (row, rowIndex) {
        row.forEach(function (cell, colIndex) {
          if (cell) {
            ctx.fillRect(
              x + (colIndex + quiet) * moduleSize,
              y + (rowIndex + quiet) * moduleSize,
              Math.ceil(moduleSize),
              Math.ceil(moduleSize)
            );
          }
        });
      });
      qrStatus.textContent = "A scannable QR code will be added to the card.";
      qrStatus.classList.remove("is-error");
    } catch (error) {
      ctx.fillStyle = background;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = dark;
      ctx.textAlign = "center";
      ctx.font = "600 15px Arial";
      ctx.fillText("SHORTEN", x + size / 2, y + size / 2 - 8);
      ctx.fillText("YOUR LINK", x + size / 2, y + size / 2 + 15);
      qrStatus.textContent = error.message;
      qrStatus.classList.add("is-error");
    }
  }

  function renderLandscape(data, palette) {
    var width = 1050;
    var height = 600;
    var left = 72;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, height);

    context.fillStyle = data.accent;
    roundedRect(context, 72, 62, 74, 74, 37);
    context.fill();
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.font = "400 26px Georgia";
    context.fillText(initials(data.shop), 109, 108);

    context.fillStyle = palette.text;
    context.textAlign = "left";
    context.font = "700 18px Arial";
    context.letterSpacing = "3px";
    context.fillText(data.shop.toUpperCase(), 168, 102);
    context.letterSpacing = "0px";

    context.font = "400 58px Georgia";
    var headings = textLines(context, data.headline, 560).slice(0, 2);
    headings.forEach(function (line, index) {
      context.fillText(line, left, 239 + index * 65);
    });

    context.font = "400 20px Arial";
    context.fillStyle = palette.muted;
    var messageStart = headings.length === 2 ? 392 : 328;
    textLines(context, data.message, 550).slice(0, 3).forEach(function (line, index) {
      context.fillText(line, left, messageStart + index * 29);
    });

    context.fillStyle = palette.panel;
    roundedRect(context, 70, 502, 568, 55, 8);
    context.fill();
    context.fillStyle = palette.text;
    context.font = "700 15px Arial";
    context.fillText(data.label.toUpperCase(), 91, 536);
    context.fillStyle = data.accent;
    context.font = "700 20px Arial";
    context.fillText(data.promo.toUpperCase(), 241, 537);

    context.strokeStyle = data.accent;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(693, 65);
    context.lineTo(693, 535);
    context.stroke();

    renderQr(context, data.destination, 757, 148, 215, palette.text, "#ffffff");
    context.fillStyle = palette.muted;
    context.textAlign = "center";
    context.font = "600 14px Arial";
    context.fillText("SCAN TO VISIT OUR SHOP", 864, 397);
    context.font = "400 17px Arial";
    context.fillText(data.social, 864, 462);
  }

  function renderPortrait(data, palette) {
    var width = 1200;
    var height = 1800;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, height);

    context.fillStyle = data.accent;
    roundedRect(context, 522, 110, 156, 156, 78);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "400 55px Georgia";
    context.textAlign = "center";
    context.fillText(initials(data.shop), 600, 208);

    context.fillStyle = palette.text;
    context.font = "700 28px Arial";
    context.letterSpacing = "6px";
    context.fillText(data.shop.toUpperCase(), 600, 336);
    context.letterSpacing = "0px";

    context.font = "400 94px Georgia";
    var headings = textLines(context, data.headline, 880).slice(0, 3);
    headings.forEach(function (line, index) {
      context.fillText(line, 600, 555 + index * 112);
    });

    context.fillStyle = palette.muted;
    context.font = "400 32px Arial";
    var messageStart = 555 + headings.length * 112 + 42;
    textLines(context, data.message, 820).slice(0, 4).forEach(function (line, index) {
      context.fillText(line, 600, messageStart + index * 48);
    });

    context.fillStyle = palette.panel;
    roundedRect(context, 170, 1055, 860, 126, 16);
    context.fill();
    context.fillStyle = palette.text;
    context.font = "700 25px Arial";
    context.fillText(data.label.toUpperCase(), 390, 1132);
    context.fillStyle = data.accent;
    context.font = "700 34px Arial";
    context.fillText(data.promo.toUpperCase(), 730, 1134);

    renderQr(context, data.destination, 415, 1280, 370, palette.text, "#ffffff");
    context.fillStyle = palette.muted;
    context.font = "600 22px Arial";
    context.fillText("SCAN TO VISIT OUR SHOP", 600, 1693);
    context.font = "400 27px Arial";
    context.fillText(data.social, 600, 1740);
  }

  function renderWatermark(data) {
    var portrait = data.size === "postcard";
    var centerX = canvas.width / 2;
    var centerY = portrait ? 930 : 317;
    var primarySize = portrait ? 52 : 26;
    var secondarySize = portrait ? 18 : 11;
    context.save();
    context.translate(canvas.width / 2, canvas.height * 0.72);
    context.rotate(-Math.PI / 9);
    context.textAlign = "center";
    context.fillStyle = data.theme === "midnight" ? "#fffdf7" : "#382f29";
    context.globalAlpha = 0.045;
    context.font = "700 " + primarySize + "px Arial";
    context.fillText("PackNote Studio", 0, 0);
    context.globalAlpha = 0.25;
    context.font = "600 " + secondarySize + "px Arial";
    context.fillText("PackNote Studio", 0, primarySize * 0.76);
    context.restore();
  }

  function draw(options) {
    var data = state();
    var palette = themes[data.theme];
    if (data.size === "postcard") {
      renderPortrait(data, palette);
    } else {
      renderLandscape(data, palette);
    }
    if (options && options.watermark) {
      renderWatermark(data);
    }
  }

  function redrawPreview() {
    draw({ watermark: !premiumUnlocked });
  }


  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        type: type,
        fields: state()
      }));
    } catch (error) {
      // Private browsing or storage restrictions must not break card creation.
    }
  }

  function restoreDraft() {
    var draft;
    try {
      draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
    } catch (error) {
      return;
    }
    if (!draft || !draft.fields) {
      return;
    }
    if (presets[draft.type]) {
      type = draft.type;
    }
    Object.keys(fields).forEach(function (key) {
      if (typeof draft.fields[key] === "string") {
        fields[key].value = draft.fields[key];
      }
    });
    document.querySelectorAll(".chip").forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.type === type);
    });
  }

  function fileName(isPremium) {
    var shop = state().shop.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var tier = isPremium ? "premium" : "free";
    return (shop || "packnote") + "-" + type + "-" + tier + "-insert.png";
  }



  function downloadPng() {
  draw({ watermark: true });
  var anchor = document.createElement("a");
  anchor.download = fileName(false);
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
  redrawPreview();
}

  function printSheet() {
  draw({ watermark: true });
  var data = state();
  var area = document.getElementById("print-area");
  var copies = data.size === "postcard" ? 1 : 8;
  area.className = data.size === "postcard" ? "postcard" : "";
  area.innerHTML = "";

  for (var i = 0; i < copies; i += 1) {
    var image = new Image();
    image.src = canvas.toDataURL("image/png");
    image.alt = "Printable packaging insert";
    area.appendChild(image);
  }

  redrawPreview();
  window.print();
}

  function applyPreset(nextType) {
    type = nextType;
    var preset = presets[type];
    fields.headline.value = preset.headline;
    fields.message.value = preset.message;
    fields.label.value = preset.label;
    fields.promo.value = preset.promo;
    document.querySelectorAll(".chip").forEach(function (button) {
      button.classList.toggle("is-selected", button.dataset.type === type);
    });
    saveDraft();
    redrawPreview();
  }

  document.querySelectorAll(".chip").forEach(function (button) {
    button.addEventListener("click", function () {
      applyPreset(button.dataset.type);
    });
  });

  Object.keys(fields).forEach(function (key) {
    fields[key].addEventListener("input", function () {
      saveDraft();
      redrawPreview();
    });
    fields[key].addEventListener("change", function () {
      saveDraft();
      redrawPreview();
    });
  });
  document.getElementById("download-free-png").addEventListener("click", function () {
  downloadPng();
});

document.getElementById("print-free-sheet").addEventListener("click", function () {
  printSheet();
});

document.getElementById("reset-template").addEventListener("click", function () {
  applyPreset(type);
});

restoreDraft();
redrawPreview();
}());
