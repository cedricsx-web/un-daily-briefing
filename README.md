# 🇺🇳 UN Daily Briefing — PWA

A Progressive Web App for daily UN briefings, installable on iPhone via Safari.

## Setup (5 minutes)

### 1. Create a GitHub repo
Name it **`un-daily-briefing`** (must match the `base` in `vite.config.js`).

### 2. Push this project
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/un-daily-briefing.git
git push -u origin main
```

### 3. Enable GitHub Pages
- Go to your repo → **Settings** → **Pages**
- Set **Source** to **GitHub Actions**
- The workflow will auto-deploy on every push

Your app will be live at:
`https://YOUR_USERNAME.github.io/un-daily-briefing/`

---

## Install on iPhone

1. Open the URL above in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — done! 🎉

The app will appear on your home screen with a full-screen experience, no browser chrome.

---

## Generate the app icons

You need two PNG icons for the home screen:
- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)

Suggested: use a UN globe emoji or your own design on a `#0a1628` dark blue background.

Free tool: [favicon.io](https://favicon.io) → PNG generator, or use Figma/Canva.

---

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173/un-daily-briefing/`

---

## How it works

Each day the app calls the Claude API with web search enabled. It searches:
- **journal.un.org** — today's UN meetings and sessions  
- **UN international observances** — any designated day today  
- **Live news** — major ongoing UN/SDG issues  

Results are cached in `sessionStorage` so you don't re-generate on every page open during the same day.
