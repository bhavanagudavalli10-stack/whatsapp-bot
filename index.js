const express = require('express');
const twilio = require('twilio');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Products from farmers
const products = [
  { id: 1, name: '🍅 Tomatoes', price: '₹30/kg', farmer: 'Ramu Farmer' },
  { id: 2, name: '🥬 Spinach', price: '₹20/bunch', farmer: 'Sita Farmer' },
  { id: 3, name: '🧅 Onions', price: '₹25/kg', farmer: 'Ramaiah Farmer' },
  { id: 4, name: '🥕 Carrots', price: '₹40/kg', farmer: 'Lakshmi Farmer' },
  { id: 5, name: '🌶️ Chillies', price: '₹60/kg', farmer: 'Krishna Farmer' },
];

// Store user sessions
const sessions = {};

app.post('/webhook', (req, res) => {
  const from = req.body.From;
  const body = req.body.Body?.trim().toLowerCase();

  if (!sessions[from]) sessions[from] = { step: 'start' };
  const session = sessions[from];

  let reply = '';

  // WELCOME
  if (session.step === 'start' || body === 'hi' || body === 'hello' || body === 'start') {
    reply = `🌾 *Welcome to Ratiu Varadhi!*
నమస్కారం! రైతు వారధికి స్వాగతం!

We connect Farmers directly with Customers 🤝

Please choose an option:
1️⃣ View Fresh Products
2️⃣ Place an Order
3️⃣ Track My Order
4️⃣ Contact Support

Reply with *1, 2, 3, or 4*`;
    session.step = 'menu';
  }

  // MENU
  else if (session.step === 'menu') {
    if (body === '1') {
      let productList = '🛒 *Fresh Products Available Today:*\n\n';
      products.forEach(p => {
        productList += `${p.id}. ${p.name}\n   💰 Price: ${p.price}\n   👨‍🌾 By: ${p.farmer}\n\n`;
      });
      productList += 'Reply with product number to order\nExample: Type *2* to order Spinach';
      reply = productList;
      session.step = 'ordering';
    }
    else if (body === '2') {
      reply = `📦 *Place an Order*\n\nFirst, let me show you available products:\n\n`;
      let productList = '';
      products.forEach(p => {
        productList += `${p.id}. ${p.name} - ${p.price}\n`;
      });
      reply += productList + '\nReply with product number to select';
      session.step = 'ordering';
    }
    else if (body === '3') {
      reply = `🔍 *Track Your Order*\n\nPlease send your *Order ID*\nExample: ORD001`;
      session.step = 'tracking';
    }
    else if (body === '4') {
      reply = `📞 *Contact Support*\n\nRatiu Varadhi Support:\n📱 Call: +91-XXXXXXXXXX\n⏰ Available: 8AM - 8PM\n\nType *Hi* to go back to main menu`;
      session.step = 'start';
    }
    else {
      reply = `❌ Invalid option. Please reply with *1, 2, 3, or 4*`;
    }
  }

  // ORDERING
  else if (session.step === 'ordering') {
    const productId = parseInt(body);
    const product = products.find(p => p.id === productId);
    if (product) {
      session.selectedProduct = product;
      reply = `✅ You selected: ${product.name}\n💰 Price: ${product.price}\n👨‍🌾 Farmer: ${product.farmer}\n\nHow many kgs/units do you want?\nExample: Type *2*`;
      session.step = 'quantity';
    } else {
      reply = `❌ Invalid selection. Please choose a number from the list.`;
    }
  }

  // QUANTITY
  else if (session.step === 'quantity') {
    const qty = parseInt(body);
    if (qty > 0) {
      session.quantity = qty;
      reply = `📍 Please share your *delivery address*\nExample: House No 12, Main Road, Eluru`;
      session.step = 'address';
    } else {
      reply = `❌ Please enter a valid quantity. Example: *2*`;
    }
  }

  // ADDRESS
  else if (session.step === 'address') {
    session.address = req.body.Body.trim();
    const orderId = 'ORD' + Date.now().toString().slice(-4);
    session.orderId = orderId;

    reply = `🎉 *Order Confirmed!*\n
━━━━━━━━━━━━━━━
📦 Order ID: *${orderId}*
🛒 Product: ${session.selectedProduct.name}
📊 Quantity: ${session.quantity}
💰 Price: ${session.selectedProduct.price}
👨‍🌾 Farmer: ${session.selectedProduct.farmer}
📍 Address: ${session.address}
━━━━━━━━━━━━━━━

✅ Your order is placed successfully!
🚚 Delivery in 24-48 hours

Thank you for supporting local farmers! 🙏
Type *Hi* to order again`;

    session.step = 'start';
  }

  // TRACKING
  else if (session.step === 'tracking') {
    reply = `🔍 Order *${req.body.Body.trim()}* Status:\n\n✅ Order Received\n✅ Farmer Notified\n🔄 Being Prepared\n⏳ Out for Delivery Soon\n\nFor help call: +91-XXXXXXXXXX\n\nType *Hi* for main menu`;
    session.step = 'start';
  }

  // DEFAULT
  else {
    reply = `Type *Hi* to start over 👋`;
    session.step = 'start';
  }

  // Send reply
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml');
  res.send(twiml.toString());
});

app.get('/', (req, res) => {
  res.send('🌾 Ratiu Varadhi WhatsApp Bot is Running!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌾 Ratiu Varadhi WhatsApp Bot running on port ${PORT}`);
});
