# HTS Expense Ledger

Business expenses and mileage log for **Hanslip Technical Services**. It runs on the UK tax year (6 April – 5 April) and gives you a record you can hand to HMRC or your accountant.

It runs as a desktop app on Mac and Windows, and also as a web page. Your records are **never stored in this repository**. They live in **OneDrive › HTS Expenses**, so both computers see the same data.

## Desktop app (recommended)

**Install**
- **Mac:** open `HTS Ledger-<version>-arm64.dmg` and drag **HTS Ledger** into **Applications**.
  - The first time, right-click the app → **Open** → **Open**. It isn't a paid, Apple-signed app, so macOS asks once.
- **Windows:** run `HTS Ledger Setup <version>.exe`.
  - If SmartScreen appears, click **More info → Run anyway** (once only).
  - It adds HTS Ledger to the Start menu and desktop.

**Data**
- On first start it finds OneDrive by itself and saves to **OneDrive › HTS Expenses**. Nothing to set up and no reconnecting.
- To use a different folder: **Sync & backup → Choose a different folder…**

**Getting installers**
- Every push to `main` builds both installers on GitHub (**Actions** tab → latest run → **Artifacts**).
- Pushing a tag such as `v1.0.1` also publishes them on the **Releases** page.

**Building locally** (needs Node.js):

```bash
npm install
npm run dist:mac   # Mac installer → dist/
npm run dist:win   # Windows installer → dist/
npm start          # run without building
```

On the Mac, `dist:mac` builds in a temporary folder and copies the installer back. That's because Documents is synced with iCloud, and iCloud's file tags stop macOS signing the app.

## Web version

1. **Open the app** at the GitHub Pages address (see "Publishing" below) in **Google Chrome** or **Microsoft Edge**. Those two browsers can link to a folder; Safari and Firefox can't.
2. **Install it (optional).** Click the install icon in the address bar (Chrome: ⊕ "Install HTS Ledger"; Edge: "App available"). It then opens in its own window from the Dock (Mac) or Start menu (PC).
3. **Link your data folder.** Go to **Sync & backup → Choose data folder…** and pick `OneDrive/HTS Expenses` on **both** computers.
   - The app saves `data.json` and a `receipts` folder there after every change.
   - It picks up the other computer's changes when you open it or switch back to it.
   - After a browser restart, click **Reconnect** once to give it access again.

If the same entry was edited on both computers, the most recent edit wins. Deletions carry across too.

**No Chrome/Edge?** Use **Sync & backup → Save transfer file** on one computer and **Load transfer file** on the other. The two sets of records are combined.

## When HMRC rules or rates change

- **Mileage rates** (Rates & rules tab) have an "applies from" date. Add a new row when HMRC changes a rate, e.g. "from 06/04/2027, 55p / 30p".
  - Each journey uses the rate in force on its date, so older journeys keep their old rate.
  - Totals recalculate immediately and the change is written to the change log, showing the before and after claim.
- **Expense categories** can be added or renamed, or moved to a different HMRC heading. Renaming updates every existing expense.
- **`rules.json`** in this repo is the published rate list. Edit it, increase `version` and push. Both computers will then show "Updated HMRC mileage rates are available" with an **Apply** button. The desktop app reads it from GitHub, so you don't need to reinstall.

## Giving HMRC a record

On the **HMRC record** tab:

- **Print / save as PDF** – summary by HMRC heading, quarterly totals, every expense, the full mileage log with odometer readings, the rates used, the change log and a signature line.
- **Excel / CSV** – for your accountant or for MTD bridging software.
- **Receipt images** – downloads every receipt for the year.

## Publishing (GitHub Pages)

The repo only contains app code, so it's safe to keep public.

GitHub → **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root → Save**. The app will be at:

`https://twistedgenetics.github.io/Expenses-App/`

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app |
| `desktop/` | Desktop wrapper (Electron): window and direct access to the data folder |
| `build/` | App icon and the Mac signing step |
| `.github/workflows/build.yml` | Builds the Mac and Windows installers on GitHub |
| `rules.json` | Published HMRC mileage rates (edit when rates change) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Let it install as an app and work offline |
| `vendor/xlsx.full.min.js` | SheetJS, for the Excel download |
