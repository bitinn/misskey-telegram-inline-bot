
const puppeteer = require("puppeteer");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");

const settings = Object.assign({}, defaults, configs);

(async() => {
    const link = "https://misskey.io/notes/9c62xgczwe";
    const browser = await puppeteer.launch();
    console.log(link);

    // optimize this?
    try {
        const page = await browser.newPage();
        await page.goto(link);

        const files = await page.waitForSelector(settings.click, { timeout: settings.timeout });
        await files.click();

        const images = await page.waitForSelector(settings.thumbnail, { timeout: settings.timeout });
        const texts = await page.waitForSelector(settings.text, { timeout: settings.timeout });

        const image = await images.evaluate(el => el.href);
        const text = await texts.evaluate(el => el.textContent);

        console.log(image);
        console.log(text);
    } catch (err) {
        console.error(err);
    }

    browser.close();
})();
