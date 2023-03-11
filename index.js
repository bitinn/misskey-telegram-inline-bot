
const { Telegraf } = require("telegraf");
const puppeteer = require("puppeteer");
const crypto = require("crypto");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");

const settings = Object.assign({}, defaults, configs);
const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

const bot = new Telegraf(settings.token);

bot.on("inline_query", async(ctx) => {
    const link = ctx.inlineQuery.query;

    if (!link) {
        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }

    let url;
    try {
        url = new URL(link);
    } catch (err) {
        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }

    if (!settings.domains.includes(url.hostname)) {
        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }

    const browser = await puppeteer.launch();
    console.log(link);

    // optimize this?
    try {
        const start = Date.now();
        console.log(start);

        const page = await browser.newPage();
        await page.goto(link, { waitUntil: 'domcontentloaded' });

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
            type: 'article',
            id: sha256(link),
            title: name,
            description: text,
            url: link,
            thumbnail_url: image,
            input_message_content: {
                message_text: name
            }
        }];

        console.log(results);
        browser.close();

        const end = Date.now();
        console.log(end - start);

        return ctx.answerInlineQuery(results, { cache_time: settings.cache_time });
    } catch (err) {
        console.error(err);
        browser.close();

        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }
});

bot.startPolling();

bot.catch((err) => {
    console.error(err)
})
