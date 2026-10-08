# Whole-site client-side encryption

TravelLog's protected Pages build encrypts every top-level HTML page with AES-256-GCM.

## Security model

- The deployed website shows only an unlock screen until the correct password is supplied.
- PBKDF2-HMAC-SHA256 (310,000 iterations) derives a 256-bit AES key from `SITE_PASSWORD`.
- Each encrypted page uses its own random 96-bit AES-GCM IV.
- The password is never written to the repository or browser storage.
- After a successful unlock, only the derived AES key is kept in `sessionStorage`, so navigation does not ask for the password on every page.
- Closing the browser/tab ends the session.
- The protected build inlines local CSS, JavaScript and current `data/*.json` snapshots into the encrypted HTML so those trip details are not separately published as plaintext assets.
- The deployed service worker clears old TravelLog caches and unregisters itself.

## One required repository secret

Create an Actions repository secret named:

`SITE_PASSWORD`

Use a long passphrase (at least 12 characters; preferably 4–5 random words plus numbers/symbols).

Do **not** put the password in a file, commit message, workflow input, repository variable, issue, or README.

After creating the secret:

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Open **Actions → Deploy protected TravelLog** and run it once, or push a new commit to `main`.

The workflow builds `_protected_site` and deploys only that encrypted artifact to GitHub Pages.

## Important limitation

The repository itself is currently public and its Git history contains the unencrypted website source. This protects the **published website**, not the public Git repository or its history.

Never commit passport numbers, passport scans, PNRs, or other new sensitive personal data as plaintext to this repository. Sensitive records should be encrypted before they are committed, or stored outside this public repository.
