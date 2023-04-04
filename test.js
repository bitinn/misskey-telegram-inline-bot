
const getNote = require("./getNote");

const links = [
    "https://misskey.io/notes/9co72ysjbl",
    "https://misskey.art/notes/9c2xq1lssn",
    "https://misskey.design/notes/9cr9kydu7w"
];

(async() => {
    const start = Date.now();
    console.log(start);

    try {
        await Promise.all(links.map(async (link) => {
            const data = await getNote(link);
            console.log(data);
        }));
    } catch (err) {
        console.error(err);
    }
})();
