const moment = require("moment");

const {pause} = require("../../engin/utils");


function getStats(page) {
    // Пример парсинга данных из HTML при помощи парсера DOM и метода evaluate
    return page.evaluate(() => {
        const rating = document.querySelector(
            "meta[itemprop=\"ratingValue\"]").getAttribute("content");
        const count = document.querySelector(
            "meta[itemprop=\"reviewCount\"]").getAttribute("content");

        return {rating: parseFloat(rating), count: parseInt(count)}
    })
}


function makeReviewsRequest(productId) {
    // Пример фабрики XHR запросов для постраничной навигации
    const url = "https://www.vprok.ru/web/api/v1/products/reviews";
    const limit = 10;

    function makeRequest(page) {
        const apiUrl = new URL(url);

        const params = {
            productId: productId,
            limit,
            page
        };

        Object.keys(params).forEach(k => {
            apiUrl.searchParams.append(k, params[k])
        })

        return {
            url: apiUrl,
            method: "GET",
            headers: {},
        }
    }

    function* makePageIterator(pagesTotal) {
        let currentPage = 1;
        while (currentPage <= pagesTotal) {
            yield makeRequest(currentPage++)
        }
    }

    return makePageIterator
}


function* getReviews(response) {
    // Пример парсинга результатов из JSON
    const doc = JSON.parse(response.data);

    for (const reviewData of doc["data"]["reviews"]) {
        const date = moment(reviewData["createdDate"]).format("DD.MM.YYYY");

        yield {
            id: reviewData["id"],
            date: date,
            author: reviewData["author"],
            rating: reviewData["rating"],
            description: reviewData["text"],
        }
    }
}


function makeProcessor(url) {
    const productPath = new URL(url).pathname
    const productSlug = productPath.split("/")[2]
    const productId = (function (arr) {
        return arr[arr.length - 1]
    })(productSlug.split("-"))

    return async function* ({getPage}) {
        // Этот метод возвращает асинхронный генератор результатов парсинга
        // Генератор (в случае парсинга отзывов) будет возвращать результаты в виде: Stats{rating, count}, Review 1, Review 2, ... Review N
        const page = await getPage("vprok", async function (page) {
            // Если страница с типом "vprok" не существует в репозитории pages, то после ее создания
            // она будет инициализирована этим скриптом
            await page.goto("https://www.vprok.ru", {
                waitUntil: 'domcontentloaded',
            });

            await pause(5000);
        });

        await page.goto(url);
        await pause(5000);

        const stats = await getStats(page);
        yield stats;

        if (stats.count === 0) {
            return
        }

        const totalPages = Math.ceil(stats.count / 10);
        const pageIterator = makeReviewsRequest(productId)(totalPages)
        for (let pageRequest of pageIterator) {
            await pause(5000);
            const response = await page.xhr(pageRequest);
            yield* getReviews(response);
        }
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