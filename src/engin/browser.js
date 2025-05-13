const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

function makeBrowserFactory(executablePath, profileDir, headless=false) {
    const args = [
        "--no-sandbox",
        "--disable-setuid-sandbox"
    ];

    function makeBrowser() {
        return puppeteer.launch({
            headless: headless,
            executablePath: executablePath,
            userDataDir: profileDir,
            args: args
        })
    }

    return makeBrowser
}

module.exports = makeBrowserFactory