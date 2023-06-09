
const { md } = require("telegram-escape");
const crypto = require("crypto");
const fetch = require("node-fetch");

const defaults = require(__dirname + "/settings-default.json");
const configs = require(__dirname + "/settings.json");
const settings = Object.assign({}, defaults, configs);

const sha256 = x => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

module.exports = async (query) => {
    let url = new URL(query);
    if (!settings.domains.includes(url.hostname)) {
        return;
    }
    const link = url.href;
    console.log("valid url: " + link);

    const id = url.pathname.split("/").at(-1);
    console.log("note id: " + id);

    url.pathname = "/api/notes/show";
    const data = await fetch(url.href, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "noteId": id }),
        timeout: settings.timeout,
    }).then(res => res.json());
    //console.log(data);

    let user = data.user.username ? data.user.username : "unknown";
    let name = data.user.name ? data.user.name : user;
    let text = data.text ? data.text : "";
    let nl = "\n";

    let fullname = `(@${user}@${url.hostname})`;

    let thumb = "";
    let image = "";

    if (data.files && data.files.length > 0) {
        image = data.files[0].url;
        thumb = data.files[0].thumbnailUrl;
    }

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
                    md`${name} ${fullname} ${nl}${nl}${text} ${nl}${nl}[Image](${image}) / [Post](${link})` :
                    md`${name} ${fullname} ${nl}${nl}${text} ${nl}${nl}[Post](${link})`,
            parse_mode: "MarkdownV2",
        },
    };
};
