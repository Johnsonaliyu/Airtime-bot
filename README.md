# Airtime Giveaway WhatsApp Bot 🎁

A WhatsApp bot that runs a fair airtime giveaway. Users DM the bot, write a compelling reason why they need airtime, get scored by AI (out of 10), and receive airtime instantly via Peyflex if they pass. Each person can only win once.

---

## Features

- **Greeted by name** — bot addresses every user personally
- **AI-scored reasons** — Groq → Nvidia → Manus → Gemini fallback chain scores 0–10
- **Pass mark: 5/10** — only genuine, well-written reasons qualify
- **Nigerian network detection** — auto-detects MTN, Airtel, Glo, 9mobile from the number
- **Instant airtime via Peyflex** — top-up sent the moment the user confirms
- **One-win-per-person rule** — tracked by WhatsApp JID + display name (persistent)
- **Group features** — constitutional Q&A bot (Amòfin) still works in groups

---

## How the DM Flow Works

```
User DMs bot
    ↓
Bot greets by name, asks for a compelling reason
    ↓
User writes their reason
    ↓
AI scores it 0–10
    ↓
Score ≥ 5 → ask for phone number     Score < 5 → rejected (can retry)
    ↓
Bot detects network (MTN/Airtel/Glo/9mobile)
    ↓
User confirms number
    ↓
Airtime sent via Peyflex ✅  →  Winner recorded (can never win again)
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `WHATSAPP_NUMBER` | ✅ | Your number in international format, no `+` (e.g. `2348012345678`) |
| `PEYFLEX_TOKEN` | ✅ | Your Peyflex API token from the dashboard |
| `GROQ_API_KEY` | ✅* | From https://console.groq.com/keys |
| `NVIDIA_API_KEY` | ✅* | From https://build.nvidia.com/ |
| `MANUS_API_KEY` | ✅* | From your Manus account |
| `GEMINI_API_KEY` | ✅* | From https://aistudio.google.com/app/apikey |
| `AIRTIME_AMOUNT` | ❌ | Airtime per winner in ₦ (default: `100`) |
| `ADMIN_NUMBER` | ❌ | Your number for admin group commands |

*At least ONE AI key is required. Add all for maximum reliability.

### 3. Run

```bash
npm start
```

On first run, a **pairing code** appears in the console:

```
==============================
  AMÒFIN PAIRING CODE: XXXXXXXX
==============================
```

Go to **WhatsApp → Linked Devices → Link a Device → Link with phone number** → enter the code.

---

## Deploy to Railway

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway auto-detects Node.js and runs `npm start`

### 3. Add environment variables

In your Railway project → **Variables** tab, add all the keys from `.env.example`.

### 4. Add a Volume for persistent storage ⚠️ Important

Railway's filesystem resets on every deploy. Without a volume, your bot loses its WhatsApp session and winner list on every redeploy.

1. In Railway → **Add Plugin** → **Volume**
2. Mount path: `/app/auth_info_baileys` → saves the WhatsApp session
3. Add a second volume at `/app/data` → saves the winners list

### 5. Link WhatsApp

After deploying, check the **Railway logs** — a pairing code appears. Use it in WhatsApp to link the bot.

---

## AI Provider Chain

| Provider | Model | Get Key |
|----------|-------|---------|
| Groq (Primary) | `llama-3.3-70b-versatile` | https://console.groq.com/keys |
| Nvidia NIM | `meta/llama-3.3-70b-instruct` | https://build.nvidia.com/ |
| Manus | Configurable | Your Manus account |
| Google Gemini | `gemini-2.0-flash` | https://aistudio.google.com/app/apikey |

---

## Peyflex Integration

Airtime is sent via [Peyflex](https://client.peyflex.com.ng). Make sure your Peyflex account has sufficient balance. The bot supports all Nigerian networks:

- **MTN** — 0803, 0806, 0810, 0813, 0816, 0703, 0706, 0903, 0906, 0913, 0916
- **Airtel** — 0802, 0808, 0812, 0701, 0708, 0901, 0902, 0907
- **Glo** — 0805, 0807, 0811, 0815, 0705, 0905
- **9mobile** — 0809, 0817, 0818, 0908, 0909

---

*Built with Baileys, Groq, Nvidia, Manus & Peyflex.*
