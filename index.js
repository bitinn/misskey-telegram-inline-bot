
const { Telegraf } = require("telegraf");
const puppeteer = require("puppeteer");
const crypto = require("crypto");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");

const settings = Object.assign({}, defaults, configs);
const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

const bot = new Telegraf(settings.token);

bot.on("inline_query", async({ inlineQuery, answerInlineQuery }) => {
    const link = inlineQuery.query;

    if (!link) {
        return answerInlineQuery([], {});
    }

    const url = new URL(link);

    if (!settings.domains.includes(url.hostname)) {
        return answerInlineQuery([], {});
    }

    const browser = await puppeteer.launch();
    console.log(link);

    // optimize this?
    try {
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

        const results = [{
            type: 'photo',
            id: sha256(link),
            caption: text + " via " + link,
            photo_url: image,
            thumb_url: image,
        }];

        console.log(results);
        browser.close();

        return answerInlineQuery(results, {});
    } catch (err) {
        console.error(err);
        browser.close();

        return answerInlineQuery([], {});
    }
});

bot.startPolling();

bot.catch((err) => {
    console.error(err)
})
