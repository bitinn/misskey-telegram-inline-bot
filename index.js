
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
    const url = new URL(link);

    if (!settings.domains.includes(url.hostname)) {
        return answerInlineQuery([]);
    }

    const browser = await puppeteer.launch();

    // optimize this?
    try {
        const page = await browser.newPage();
        await page.goto(url);

        const images = await page.waitForSelector(settings.thumbnail, { timeout: 5000 });
        const texts = await page.waitForSelector(settings.text, { timeout: 5000 });

        const image = await images.evaluate(el => el.href);
        const text = await texts.evaluate(el => el.textContent);

        const results = [{
            type: 'photo',
            id: sha256(link),
            caption: text,
            photo_url: image,
            thumb_url: image,
        }];

        console.log(results);

        return answerInlineQuery(results);
    } catch (err) {
        browser.close();
        console.error(err);
        return answerInlineQuery([]);
    }
});

bot.startPolling();

bot.catch((err) => {
    console.error(err)
})
