
const { Telegraf } = require("telegraf");
const getNote = require("./getNote");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");
const settings = Object.assign({}, defaults, configs);

const bot = new Telegraf(settings.token);

bot.on("inline_query", async(ctx) => {
    const start = Date.now();
    console.log(start);

    const link = ctx.inlineQuery.query;
    if (!link) {
        return ctx.answerInlineQuery([], { cache_time: settings.cache_time });
    }

    // optimize this?
    try {
        const data = await getNote(link);
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

    const end = Date.now();
    console.log("app start: " + (end - start));
})();

process.once('SIGINT', () => {
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
});
