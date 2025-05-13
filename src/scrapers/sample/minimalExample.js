const {pause} = require("../../engin/utils");


function makeProcessor(url) {
    return async function* ({getPage}) {
        const page = await getPage("google", async function (page) {
            //skip onCreate
        });

        await page.goto(url, {
            waitUntil: "domcontentloaded",
        })

        await pause(5000);

        yield 'done'
    }
}


(async function () {
    // Эта часть нужна для отладки процессора. Позволяет запустить файл со скриптом процессора.
    // Например, для запуска этого скрипта нужно запустить его из корня проекта командой: node ./src/scrapers/vprok/reviews.js
    if (require.main === module) {
        const {debug} = require("../../utils");

        await debug(makeProcessor(
            "https://www.vprok.ru/product/domik-v-derevne-dom-v-der-moloko-3-5-950g--306295"
        ));
    }
})();

module.exports = makeProcessor