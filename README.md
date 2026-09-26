# Tiling website — Jordan McPherson

Static site (HTML/CSS/JS, no build step).

```
index.html      Home — scroll-driven "lay the floor" hero, services, pattern studio, process, CTA
contact.html    Free-quote form with photo attachments (drag & drop, previews, auto-compression)
css/styles.css  All styles
js/config.js    ← business name, phone, email, service area, ABN, form endpoint
js/patterns.js  Canvas tile-pattern renderer (herringbone, subway, crazy pave, pool mosaic…)
js/main.js      Nav, reveals, pattern studio, hero scroll animation
js/contact.js   Quote form logic
```

## Before going live
1. **Business details** – edit `js/config.js`. The name also appears as fallback text in the HTML
   `<title>` tags and markup, so do a find & replace of `McPherson Tiling` across the `.html` files too.
2. **Quote form**
   - **Netlify (easiest):** drag the folder into Netlify. Forms are detected automatically
     (`data-netlify="true"`), and photos arrive with each submission. In Netlify → Forms → Notifications,
     add an email notification to Jordan's address.
   - **Other host:** create a form endpoint (Formspree, Basin, etc. — file uploads need a plan that supports
     them) and paste the URL into `formEndpoint` in `config.js`.
   - If sending ever fails, the visitor is offered a pre-filled email to the business instead.
3. **Real photos** – once Jordan has job photos, they can replace or sit alongside the pattern artwork.

## Preview tricks
- Run locally: `python -m http.server 5510` then open http://localhost:5510
- `index.html?p=0.5` freezes the hero animation at 50% (handy for screenshots).
