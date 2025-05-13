const {pause} = require("../../engin/utils");


function makeSearchRequest(query, brand) {
    const url = "https://www.vprok.ru/web/api/v1/catalog/search";
    const limit = 60;

    function makeRequest(page) {
        const apiUrl = new URL(url);

        const params = {
            text: query,
            sort: "relevance_desc",
            limit: limit,
            page: page
        };

        Object.keys(params).forEach(k => {
            apiUrl.searchParams.append(k, params[k])
        });

        const body = {
            "filter": {
                "brend": [brand]
            }
        }

        return {
            url: apiUrl,
            method: "POST",
            body: body,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        }
    }

    function* makePageIterator(pagesTotal) {
        let currentPage = 2;
        while (currentPage <= pagesTotal) {
            yield makeRequest(currentPage++)
        }
    }

    return [makeRequest(1), makePageIterator]
}


function getStats(response) {
    const doc = JSON.parse(response["data"]);
    return {
        total: doc["pages"]
    }
}


function* getProducts(response) {
    const doc = JSON.parse(response.data);

    for (const item of doc["products"]) {
        yield {
            id: item["productId"],
            name: item["name"],
            vendor: item["brand"]["name"],
            url: new URL(item["url"], "https://www.vprok.ru/").href,
            rating: item["rating"],
            count: item["reviews"]
        }
    }
}

function makeProcessor(url) {
    const searchParams = new URL(url).searchParams;
    const query = searchParams.get("text");
    const brand = searchParams.get("filter.brend");

    return async function* ({getPage}) {
        const page = await getPage("vprok", async function (page) {
            await page.goto("https://www.vprok.ru", {
                waitUntil: 'domcontentloaded',
            });
            await pause(5000);
        });

        const [initRequest, makeIterator] = makeSearchRequest(query, brand);
        const response = await page.xhr(initRequest);

        const stats = getStats(response);
        yield* getProducts(response);

        for (let pageRequest of makeIterator(stats.total)) {
            await pause(5000);
            const response = await page.xhr(pageRequest);
            yield* getProducts(response);
        }
    }
}


(async function () {
    if (require.main === module) {
        const {debug} = require("../../utils");

        await debug(makeProcessor(
            "https://www.vprok.ru/catalog/search?text=whiskas&sort=relevance_desc&filter.brend=whiskas"
        ));
    }
})();

module.exports = makeProcessor