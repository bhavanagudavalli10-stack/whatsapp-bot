# 🤖 Ratiu Varadhi WhatsApp Business Bot

A full-featured WhatsApp Business Bot with:
- 🛒 Product browsing & ordering
- 📦 Order tracking
- ❓ FAQ auto-replies
- 🎁 Offers & deals
- 📞 Contact info

---

## ⚙️ SETUP GUIDE (Step by Step)

### STEP 1 — Install Node.js
Download from: https://nodejs.org
Choose "LTS" version → Install

### STEP 2 — Install Bot Files
1. Create a folder called `whatsapp-bot` on your computer
2. Copy all files (index.js, package.json, .env) into it
3. Open that folder in Command Prompt / Terminal

### STEP 3 — Install Dependencies
Run this command:
```
npm install
```

### STEP 4 — Get Meta API Credentials
1. Go to https://developers.facebook.com
2. Create an App → Choose "Business" type
3. Add "WhatsApp" product
4. Go to WhatsApp → API Setup
5. Copy your:
   - **Access Token** → paste in .env as WHATSAPP_TOKEN
   - **Phone Number ID** → paste in .env as PHONE_NUMBER_ID

### STEP 5 — Set Up Webhook (use ngrok for testing)
1. Download ngrok: https://ngrok.com
2. Run: `ngrok http 3000`
3. Copy the https URL (e.g. https://abc123.ngrok.io)
4. In Meta Developer Console → WhatsApp → Webhook:
   - URL: `https://abc123.ngrok.io/webhook`
   - Verify Token: `mybot123`
5. Subscribe to: `messages`

### STEP 6 — Start the Bot
```
npm start
```

---

## 🧪 TEST YOUR BOT
Send "hi" to your WhatsApp Business number and the bot will reply!

---

## 📦 BOT FEATURES

| Feature | How to trigger |
|---------|---------------|
| Main Menu | Send: hi, hello, menu |
| Shop Products | Choose "Shop Products" from menu |
| Track Order | Choose "My Orders" → enter Order ID |
| FAQ | Choose "FAQ" from menu |
| Offers | Choose "Offers & Deals" |
| Contact | Choose "Contact Us" |

---

## 🛍️ CUSTOMIZE PRODUCTS
Open `index.js` and edit the PRODUCTS section:
```js
const PRODUCTS = {
  "1": { name: "Your Product", price: 299, emoji: "👕", stock: true },
  ...
};
```

---

## 🚀 DEPLOY TO PRODUCTION
Use Railway (free): https://railway.app
1. Upload files to GitHub
2. Connect Railway to your GitHub repo
3. Add environment variables from .env
4. Deploy!