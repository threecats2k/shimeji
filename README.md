# Mooshi landing page

Static site (HTML/CSS/JS, no build step). Live shimeji walk the page, perch on cards, climb the
sides and can be dragged and thrown.

```
index.html   page + English copy
styles.css   tokens mirror app colors.xml (Design.md)
config.js    Play URL (with UTM), App Store URL, Discord invite, deep-link scheme  ← edit before publishing
i18n.js      Vietnamese copy, hero words, pet speech bubbles
shimeji.js   pet engine (walk / sit / roll / climb / jump to perch / drag-throw / dizzy)
app.js       reveal, counters, tilt, redeem demo, chat, language toggle
assets/      app icon, hamster sprites, drawn costume hamsters, and other pet skins
```

Run locally: `python3 -m http.server 5317 --directory website`

Make an element a perch: add `data-perch` (needs to be at least 110×30 px).

Shared code links: `https://<domain>/?code=MOOSHI-SNOW#codes` prefills the code; on Android
"Claim in the app" opens `mooshi://redeem?code=…` on Android (Google Play if the app isn't installed), or the App Store on iPhone and iPad.

Deploy anywhere static: Firebase Hosting, Bunny storage + pull zone, GitHub Pages, Netlify.
