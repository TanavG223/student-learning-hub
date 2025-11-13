## LearnHub Student Hub

This repository keeps the LearnHub prototype exactly as you run it from the `Website/` folder. All logic is client-side (HTML/CSS/JS + `localStorage`), so the GitHub-hosted version is identical to your localhost build.

### Run it locally

1. `cd Website`
2. Start any static server (for example `python3 -m http.server 8000` or `npx serve .`)
3. Visit `http://localhost:8000/login.html`, sign in, and explore the rest of the site. Progress, quizzes, practice sets, streaks, and group codes are stored in `localStorage`, so they behave the same way online.

### Deploy to GitHub Pages (matches localhost)

1. Push this repo to GitHub.
2. In your repo, open **Settings → Pages → Build and deployment** and choose **Source: GitHub Actions**.
3. The included workflow `.github/workflows/deploy.yml` uploads the `Website/` directory on every push to `main` and publishes it to GitHub Pages.
4. After the workflow finishes, GitHub shows the live URL (e.g. `https://<username>.github.io/<repo>/`). That site serves the exact same files you tested locally, so nothing breaks when you deploy.

### Post-deploy checklist

- Visit `<site-url>/login.html`, sign in, and confirm you land on `index.html`.
- Open `resources.html` and run a practice or test session to see XP increase.
- Check `dashboard.html` for points, rewards, and the streak widget.
- Go to `groups.html`, create a share code, and join it from another browser profile.
- If anything looks stuck, clear the browser storage for the domain (since everything is saved locally) and reload.

Following these steps guarantees the GitHub Pages build is a byte-for-byte copy of what runs on localhost.
