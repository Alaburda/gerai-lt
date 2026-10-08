# gerAI.lt — Viskas bus gerAI

A parody of AI-consultancy landing pages. Static HTML/CSS/JS, no build step, no tracking, nothing is sent anywhere.

## Run locally

Open `index.html` in a browser, or:

```bash
python -m http.server 8000
```

## Deploy to GitHub Pages

1. Push this folder to a new GitHub repo.
2. Settings → Pages → Deploy from branch → `main` / root.

## Files

- `index.html` – all copy (Lithuanian). Elements with `data-corp` swap to "Corporate" Lithuanian-English.
- `styles.css` – theme tokens at the top (light šaltibarščiai); `body.hot` overrides them for the dark karšti barščiai theme.
- `app.js` – DI/AI/SI toggle, Corporate mode, šalti/karšti barščiai theme switch, "Nebūk ___" rotator, do-nothing mode, negative-hours chart, audit quiz, policy generator, token burn, chatbot, modals.
- `og.png` – social share preview (1200×630). Source: `og/og.html`; regenerate with
  `chrome --headless=new --hide-scrollbars --window-size=1200,630 --virtual-time-budget=5000 --screenshot=og.png og/og.html`.
  The `og:image` URL in `index.html` points to `https://alaburda.github.io/gerai-lt/og.png` – change it if you use a custom domain.

All people, companies and numbers are made up.
