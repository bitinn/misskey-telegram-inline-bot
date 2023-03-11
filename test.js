
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
        const start = Date.now();
        console.log(start);

        const page = await browser.newPage();
        await page.goto(link);

        const title = await page.waitForSelector("title", { timeout: settings.timeout });
        const name = await title.evaluate(el => el.textContent);
        console.log(name);

        const files = await page.waitForSelector(settings.click, { timeout: settings.timeout });
        console.log("found " + settings.click);
        await files.click();

        const images = await page.waitForSelector(settings.thumbnail, { timeout: settings.timeout });
        const texts = await page.waitForSelector(settings.text, { timeout: settings.timeout });
        console.log("found " + settings.thumbnail);

        const image = await images.evaluate(el => el.href);
        const text = await texts.evaluate(el => el.textContent);

        console.log(image);
        console.log(text);

        const end = Date.now();
        console.log(end - start);
    } catch (err) {
        console.error(err);
    }

    browser.close();
})();
