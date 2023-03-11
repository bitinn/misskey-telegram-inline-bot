
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
        await page.goto(url);

        const files = await page.waitForSelector(settings.click, { timeout: settings.timeout });
        await files.click();

        const images = await page.waitForSelector(settings.thumbnail, { timeout: settings.timeout });
        const texts = await page.waitForSelector(settings.text, { timeout: settings.timeout });

        const image = await images.evaluate(el => el.href);
        const text = await texts.evaluate(el => el.textContent);

        const results = [{
            type: 'photo',
            id: sha256(link),
            caption: text + " via " + link,
            photo_url: image,
            thumb_url: image,
        }];

        console.log(results);

        return answerInlineQuery(results, {});
    } catch (err) {
        browser.close();
        console.error(err);
        return answerInlineQuery([], {});
    }
});

bot.startPolling();

bot.catch((err) => {
    console.error(err)
})
