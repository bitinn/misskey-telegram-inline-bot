
const { Telegraf } = require("telegraf");
const puppeteer = require("puppeteer");
const { md } = require("telegram-escape");
const crypto = require("crypto");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");

const settings = Object.assign({}, defaults, configs);
const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

const bot = new Telegraf(settings.token);
let browser;

async function getData(browser, link, start) {
    const page = await browser.newPage();
    console.log("open tab: " + link);

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.resourceType() === 'image') {
            req.abort();
        } else {
            req.continue();
        }
    });

    var to = setTimeout(async() => {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }, settings.tab);

    await page.goto(link, { waitUntil: "load", timeout: settings.timeout });
    console.log("open page: " + link);

    const title = await page.waitForSelector(settings.title, { timeout: settings.timeout });
    const name = await title.evaluate(el => el.textContent);
    console.log("get title: " + name);

    let text = "";
    let url = "";
    try {
        const texts = await page.waitForSelector(settings.text, { timeout: settings.timeout });
        text = await texts.evaluate(el => el.textContent);

        const links = await page.waitForSelector(settings.link, { timeout: settings.find });
        url = await links.evaluate(el => el.href);
    } catch (err) {
        // skip
    }

    let thumb = "";
    let image = "";
    try {
        const files = await page.waitForSelector(settings.click, { timeout: settings.find });
        await files.click();
        console.log("click files: " + link);

        const images = await page.waitForSelector(settings.image, { timeout: settings.timeout });
        image = await images.evaluate(el => el.href);

        const thumbs = await page.waitForSelector(settings.thumbnail, { timeout: settings.timeout });
        thumb = await thumbs.evaluate(el => el.src);
    } catch (err) {
        // skip
    }

    console.log("got data: " + (image ? "image" : "link"));

    const end = Date.now();
    console.log("time taken: " + (end - start) + " " + link);

    await page.close();
    clearTimeout(to);

    return {
        type: 'article',
        id: sha256(link),
        title: name,
        description: text,
        url: link,
        thumbnail_url: thumb,
        input_message_content: {
            message_text:
                image ?
                    md`${name} %0A ${text} %0A [image](${image}) %0A [post](${link})` :
                    url ?
                        md`${name} %0A ${text} %0A [link](${url})` :
                        md`${name} %0A ${text}`,
            parse_mode: "MarkdownV2",
        },
    };
}

bot.on("inline_query", async(ctx) => {
    const start = Date.now();
    console.log(start);

    const link = ctx.inlineQuery.query;

    if (!browser) {
        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }

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

    // optimize this?
    try {
        const data = await getData(browser, link, start);
        console.log(data);

        return ctx.answerInlineQuery([data], { cache_time: settings.cache_time });
    } catch (err) {
        console.error(err);

        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }
});

bot.catch((err) => {
    console.error(err);
});

(async() => {
    bot.launch();

    const start = Date.now();
    console.log(start);

    browser = await puppeteer.launch();

    const end = Date.now();
    console.log("app start: " + (end - start));
})();

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    browser.close();
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    browser.close();
});
