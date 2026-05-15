const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ─── CONFIG ───────────────────────────────────────────────
const CONFIG = {
  token: process.env.WHATSAPP_TOKEN,         // Your Meta API Token
  phoneNumberId: process.env.PHONE_NUMBER_ID, // Your WhatsApp Phone Number ID
  verifyToken: process.env.VERIFY_TOKEN,      // Any string you choose e.g. "mybot123"
  apiVersion: "v19.0",
};

// ─── PRODUCT CATALOG ──────────────────────────────────────
const PRODUCTS = {
  "1": { name: "T-Shirt",      price: 299,  emoji: "👕", stock: true },
  "2": { name: "Jeans",        price: 799,  emoji: "👖", stock: true },
  "3": { name: "Sneakers",     price: 1299, emoji: "👟", stock: true },
  "4": { name: "Cap",          price: 199,  emoji: "🧢", stock: true },
  "5": { name: "Bag",          price: 499,  emoji: "👜", stock: false },
};

// ─── ORDER STORAGE (in-memory; use DB for production) ─────
const orders = {};
const userSessions = {};

// ─── WEBHOOK VERIFY ───────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === CONFIG.verifyToken) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── RECEIVE MESSAGES ─────────────────────────────────────
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return res.sendStatus(404);

    const entry   = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const message = value?.messages?.[0];

    if (!message) return res.sendStatus(200);

    const from = message.from;
    const type = message.type;
    let text = "";

    if (type === "text") {
      text = message.text.body.trim().toLowerCase();
    } else if (type === "interactive") {
      text = message.interactive?.button_reply?.id ||
             message.interactive?.list_reply?.id || "";
    }

    console.log(`📩 Message from ${from}: ${text}`);
    await handleMessage(from, text);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err.message);
    res.sendStatus(500);
  }
});

// ─── MESSAGE HANDLER ──────────────────────────────────────
async function handleMessage(from, text) {
  const session = userSessions[from] || { step: "start" };

  // MAIN MENU triggers
  if (["hi", "hello", "hey", "helo", "start", "menu", "0"].includes(text) || session.step === "start") {
    userSessions[from] = { step: "menu" };
    await sendMainMenu(from);
    return;
  }

  switch (session.step) {
    case "menu":
      await handleMenuChoice(from, text, session);
      break;
    case "browse":
      await handleBrowse(from, text, session);
      break;
    case "order_quantity":
      await handleOrderQuantity(from, text, session);
      break;
    case "order_confirm":
      await handleOrderConfirm(from, text, session);
      break;
    case "order_address":
      await handleOrderAddress(from, text, session);
      break;
    case "order_track":
      await handleTrackOrder(from, text, session);
      break;
    default:
      await sendMainMenu(from);
  }
}

// ─── MAIN MENU ────────────────────────────────────────────
async function sendMainMenu(from) {
  await sendMessage(from, {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "🛍️ Ratiu Varadhi Retail" },
      body: { text: "Welcome! How can I help you today? Please choose an option below 👇" },
      footer: { text: "Reply anytime with 'menu' to return here" },
      action: {
        button: "View Options",
        sections: [
          {
            title: "What would you like?",
            rows: [
              { id: "shop",    title: "🛒 Shop Products",    description: "Browse our latest collection" },
              { id: "orders",  title: "📦 My Orders",        description: "Track your existing orders" },
              { id: "faq",     title: "❓ FAQ",               description: "Common questions answered" },
              { id: "offer",   title: "🎁 Offers & Deals",   description: "Today's special discounts" },
              { id: "contact", title: "📞 Contact Us",        description: "Speak to our team" },
            ],
          },
        ],
      },
    },
  });
}

// ─── MENU CHOICE HANDLER ──────────────────────────────────
async function handleMenuChoice(from, text, session) {
  switch (text) {
    case "shop":
      userSessions[from] = { step: "browse" };
      await sendProductList(from);
      break;
    case "orders":
      userSessions[from] = { step: "order_track" };
      await sendText(from, "📦 Please enter your *Order ID* to track your order:\n_(e.g. ORD-1234)_");
      break;
    case "faq":
      await sendFAQ(from);
      break;
    case "offer":
      await sendOffers(from);
      break;
    case "contact":
      await sendContact(from);
      break;
    default:
      await sendMainMenu(from);
  }
}

// ─── PRODUCT LIST ─────────────────────────────────────────
async function sendProductList(from) {
  let msg = "🛍️ *Our Products*\n\n";
  for (const [id, p] of Object.entries(PRODUCTS)) {
    const status = p.stock ? "✅ In Stock" : "❌ Out of Stock";
    msg += `*${id}.* ${p.emoji} ${p.name}\n   💰 ₹${p.price}  |  ${status}\n\n`;
  }
  msg += "➡️ Reply with the *product number* to order\n_(e.g. type 1 for T-Shirt)_\n\nType *0* to go back to menu";
  await sendText(from, msg);
}

// ─── BROWSE / SELECT PRODUCT ─────────────────────────────
async function handleBrowse(from, text, session) {
  if (text === "0") { await sendMainMenu(from); return; }
  const product = PRODUCTS[text];
  if (!product) {
    await sendText(from, "❌ Invalid choice. Please enter a number from 1–5 or type *0* for menu.");
    return;
  }
  if (!product.stock) {
    await sendText(from, `😔 Sorry, *${product.name}* is currently out of stock.\n\nPlease choose another product or type *0* for menu.`);
    return;
  }
  userSessions[from] = { step: "order_quantity", product };
  await sendMessage(from, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: `${product.emoji} *${product.name}*\n💰 Price: ₹${product.price}\n\nHow many would you like to order?` },
      action: {
        buttons: [
          { type: "reply", reply: { id: "qty_1", title: "1 piece" } },
          { type: "reply", reply: { id: "qty_2", title: "2 pieces" } },
          { type: "reply", reply: { id: "qty_3", title: "3 pieces" } },
        ],
      },
    },
  });
}

// ─── ORDER QUANTITY ───────────────────────────────────────
async function handleOrderQuantity(from, text, session) {
  const qtyMap = { qty_1: 1, qty_2: 2, qty_3: 3 };
  const qty = qtyMap[text] || parseInt(text);
  if (!qty || qty < 1 || qty > 10) {
    await sendText(from, "❌ Please choose a valid quantity (1–10).");
    return;
  }
  const total = session.product.price * qty;
  session.qty   = qty;
  session.total = total;
  session.step  = "order_confirm";
  userSessions[from] = session;

  await sendMessage(from, {
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `🧾 *Order Summary*\n\n${session.product.emoji} ${session.product.name} × ${qty}\n💰 ₹${session.product.price} × ${qty} = *₹${total}*\n🚚 Delivery: FREE\n\n*Confirm your order?*`,
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "confirm_yes", title: "✅ Confirm Order" } },
          { type: "reply", reply: { id: "confirm_no",  title: "❌ Cancel" } },
        ],
      },
    },
  });
}

// ─── ORDER CONFIRM ────────────────────────────────────────
async function handleOrderConfirm(from, text, session) {
  if (text === "confirm_no") {
    userSessions[from] = { step: "menu" };
    await sendText(from, "❌ Order cancelled. Returning to menu...");
    await sendMainMenu(from);
    return;
  }
  if (text === "confirm_yes") {
    session.step = "order_address";
    userSessions[from] = session;
    await sendText(from, "📍 Please send your *delivery address*:\n_(Include house no., street, city, pincode)_");
    return;
  }
  await sendText(from, "Please tap ✅ Confirm Order or ❌ Cancel.");
}

// ─── ORDER ADDRESS ────────────────────────────────────────
async function handleOrderAddress(from, text, session) {
  const orderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
  orders[orderId] = {
    id: orderId,
    customer: from,
    product: session.product.name,
    qty: session.qty,
    total: session.total,
    address: text,
    status: "Confirmed",
    date: new Date().toLocaleDateString("en-IN"),
  };
  userSessions[from] = { step: "menu" };

  await sendText(from,
    `✅ *Order Placed Successfully!*\n\n` +
    `🆔 Order ID: *${orderId}*\n` +
    `${session.product.emoji} ${session.product.name} × ${session.qty}\n` +
    `💰 Total: ₹${session.total}\n` +
    `📍 Address: ${text}\n` +
    `📅 Date: ${orders[orderId].date}\n` +
    `🚚 Estimated Delivery: 3–5 business days\n\n` +
    `Thank you for shopping with *Ratiu Varadhi Retail*! 🙏\n` +
    `Save your Order ID to track later.\n\nType *menu* to return to main menu.`
  );
}

// ─── TRACK ORDER ─────────────────────────────────────────
async function handleTrackOrder(from, text, session) {
  if (text === "0") { await sendMainMenu(from); return; }
  const order = orders[text.toUpperCase()];
  if (!order) {
    await sendText(from, `❌ No order found with ID *${text}*.\n\nPlease check and try again, or type *0* for menu.`);
    return;
  }
  userSessions[from] = { step: "menu" };
  await sendText(from,
    `📦 *Order Details*\n\n` +
    `🆔 Order ID: ${order.id}\n` +
    `🛍️ Product: ${order.product} × ${order.qty}\n` +
    `💰 Total: ₹${order.total}\n` +
    `📍 Address: ${order.address}\n` +
    `📅 Date: ${order.date}\n` +
    `📊 Status: *${order.status}* ✅\n\n` +
    `Type *menu* to return to main menu.`
  );
}

// ─── FAQ ──────────────────────────────────────────────────
async function sendFAQ(from) {
  userSessions[from] = { step: "menu" };
  await sendText(from,
    `❓ *Frequently Asked Questions*\n\n` +
    `*Q1. What are your delivery charges?*\n✅ FREE delivery on all orders!\n\n` +
    `*Q2. How long does delivery take?*\n✅ 3–5 business days\n\n` +
    `*Q3. Can I return a product?*\n✅ Yes! 7-day easy returns\n\n` +
    `*Q4. What payment methods do you accept?*\n✅ UPI, Card, Cash on Delivery\n\n` +
    `*Q5. How do I track my order?*\n✅ Go to menu → My Orders → Enter Order ID\n\n` +
    `*Q6. Do you offer bulk discounts?*\n✅ Yes! Contact us for bulk orders\n\n` +
    `Type *menu* to go back.`
  );
}

// ─── OFFERS ───────────────────────────────────────────────
async function sendOffers(from) {
  userSessions[from] = { step: "menu" };
  await sendText(from,
    `🎁 *Today's Special Offers!*\n\n` +
    `🔥 *OFFER 1:* Buy 2 T-Shirts → Get 10% OFF\n` +
    `🔥 *OFFER 2:* Orders above ₹999 → FREE Cap 🧢\n` +
    `🔥 *OFFER 3:* First order → Extra ₹50 OFF\n` +
    `🔥 *OFFER 4:* Refer a friend → ₹100 cashback\n\n` +
    `Use code *RATIU10* at checkout for 10% off!\n\n` +
    `⏰ Offers valid today only!\n\nType *shop* to browse products or *menu* to go back.`
  );
}

// ─── CONTACT ──────────────────────────────────────────────
async function sendContact(from) {
  userSessions[from] = { step: "menu" };
  await sendText(from,
    `📞 *Contact Ratiu Varadhi Retail*\n\n` +
    `📱 WhatsApp: +91 XXXXXXXXXX\n` +
    `📧 Email: ratiu@example.com\n` +
    `🕐 Hours: Mon–Sat, 9AM–7PM\n` +
    `📍 Location: Vijayawada, Andhra Pradesh\n\n` +
    `Our team will reply within 1 hour! 😊\n\nType *menu* to go back.`
  );
}

// ─── SEND HELPERS ─────────────────────────────────────────
async function sendText(to, text) {
  await sendMessage(to, { type: "text", text: { body: text } });
}

async function sendMessage(to, messageObj) {
  try {
    await axios.post(
      `https://graph.facebook.com/${CONFIG.apiVersion}/${CONFIG.phoneNumberId}/messages`,
      { messaging_product: "whatsapp", to, ...messageObj },
      { headers: { Authorization: `Bearer ${CONFIG.token}`, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send error:", err.response?.data || err.message);
  }
}

// ─── START SERVER ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 WhatsApp Bot running on port ${PORT}`));