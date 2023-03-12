
const puppeteer = require("puppeteer");
const { md } = require("telegram-escape");
const crypto = require("crypto");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");

const settings = Object.assign({}, defaults, configs);

const links = [
    "https://misskey.io/notes/9c62xgczwe",
    "https://misskey.io/notes/9c7kxepaks",
    "https://misskey.io/notes/9c8bc5l311"
];

const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

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

    await page.goto(link, { waitUntil: "domcontentloaded", timeout: settings.timeout });
    console.log("open page: " + link);

    const title = await page.waitForSelector(settings.title, { timeout: settings.timeout });
    const files = await page.waitForSelector(settings.click, { timeout: settings.timeout });
    const name = await title.evaluate(el => el.textContent);
    await files.click();
    console.log("click files: " + link);

    const texts = await page.waitForSelector(settings.text, { timeout: settings.timeout });
    const thumbs = await page.waitForSelector(settings.thumbnail, { timeout: settings.timeout });
    const images = await page.waitForSelector(settings.image, { timeout: settings.timeout });
    const text = await texts.evaluate(el => el.textContent);
    const thumb = await thumbs.evaluate(el => el.src);
    const image = await images.evaluate(el => el.href);
    console.log("got data: " + link);

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
            message_text: md`${name} / ${text} / [image](${image}) / [post](${link})`,
            parse_mode: "MarkdownV2",
        },
    };
}

(async() => {
    const start = Date.now();
    console.log(start);

    const browser = await puppeteer.launch();

    const end = Date.now();
    console.log("session start: " + (end - start));

    try {
        await Promise.all(links.map(async (link) => {
            const data = await getData(browser, link, start);
            console.log(data);
        }));
    } catch (err) {
        console.error(err);
    }

    browser.close();
})();
