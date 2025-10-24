# Geometry Games Web Edition

This repository now contains a browser-based version of the Geometry Games activity so students can play on Chromebooks and other devices without installing an app.

## Getting started

1. Open the `web/index.html` file in a modern browser, or serve the `web/` directory with a simple web server:
   ```bash
   python -m http.server --directory web 8000
   ```
2. Visit <http://localhost:8000> to play the game.

No build step is required. All logic is implemented with vanilla HTML, CSS, and JavaScript.

## Gameplay highlights

- Timed rounds encourage quick mental math with geometry topics such as area, perimeter, circumference, composite figures, and translations.
- Difficulty settings adjust the scale of dimensions and point values, making it easy to differentiate practice for different classes.
- A dynamic canvas draws each challenge with labeled dimensions, helping students connect visuals with calculations.
- High-score tracking (stored locally in the browser) keeps students motivated across sessions.

## Customization tips

- Adjust the `TOTAL_TIME` constant in `web/app.js` to change the length of each round.
- Modify the `QUESTION_GENERATORS` array in `web/app.js` to add, remove, or tweak challenge types.
- Update the layout or color palette in `web/styles.css` to match your classroom branding.

Enjoy exploring geometry with your students!
