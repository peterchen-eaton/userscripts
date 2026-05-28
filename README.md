# userscripts

A collection of Tampermonkey userscripts.

---

## What is Tampermonkey?

[Tampermonkey](https://www.tampermonkey.net/) is a popular browser extension that allows you to run custom JavaScript snippets (called **userscripts**) on any web page. Userscripts can modify the appearance or behavior of websites to suit your needs — all without changing the website's source code.

### What can userscripts do?

- **Customize UI** — Hide, restyle, or rearrange elements on a page.
- **Automate tasks** — Auto-click buttons, auto-fill forms, or skip repetitive steps.
- **Add features** — Inject new buttons, shortcuts, or widgets that the original site doesn't provide.
- **Fix annoyances** — Remove ads, pop-ups, or other unwanted content.

### How to install and set up Tampermonkey

1. **Install the Tampermonkey extension**
   - **Chrome** (recommended): Visit the [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and click **Add to Chrome** → **Add extension**.
   - **Edge**: Visit the [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) and click **Get** → **Add extension**.

2. **Pin the extension to the toolbar** (if the icon is not visible)
   - Click the **puzzle piece icon** (🧩 Extensions) at the top-right of the browser toolbar.
   - Find **Tampermonkey** in the list.
   - Click the **pin icon** (📌) next to it — the Tampermonkey icon will now always appear in the toolbar.

3. **⚠️ Enable Developer Mode and User Scripts permission**
   - Right-click the **Tampermonkey icon** in the toolbar and select **Manage Extension**.
   - On the extension detail page:
     - ⚠️ Turn **ON** the **Developer mode** toggle.
     - ⚠️ Turn **ON** the **Allow User Scripts** toggle.
   - Confirm any prompts the browser shows.

   > **⚠️ IMPORTANT**: Both **Developer mode** and **Allow User Scripts** MUST be enabled. Without these settings, Tampermonkey cannot inject or run userscripts and your scripts will silently fail.

4. **Add a userscript**
   - Click the Tampermonkey icon in your browser toolbar, then select **Create a new script**.
   - Paste the contents of the `.user.js` file you want to use, then press **Ctrl + S** (or **Cmd + S**) to save.
   - Alternatively, open a raw `.user.js` URL directly in your browser — Tampermonkey will automatically prompt you to install it.

5. **Manage scripts**
   - Click the Tampermonkey icon → **Dashboard** to enable, disable, edit, or delete installed scripts.

---

## Scripts

| Script | Description |
|--------|-------------|
| [GitHub Custom Tools](github-custom-tools/script.user.js) | Customizations for GitHub — wider sidebar, auto SSO follow, and more. |
| [Show Copilot Usage](show-copilot-usage/script.user.js) | Display Copilot quota in a compact top-right overlay on GitHub pages, refreshing every 5 minutes. |
