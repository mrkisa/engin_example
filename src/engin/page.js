const CRASH_MESSAGE = "Session closed. Most likely the page has been closed"

async function makePage(browser, onCrash) {
    // Обертка для страницы браузера, которая будет реагировать на падения браузера
    // При падении вызывает процедуру onCrash
    const page = await browser.newPage();

    async function goto(url, options = {}) {
        try {
            await page.goto(url, options)
        } catch (err) {
            if (err.message.includes(CRASH_MESSAGE)) {
                await onCrash()
            }
            throw err
        }
    }

    async function click(selector, options) {
        try {
            await page.click(selector, options)
        } catch (err) {
            if (err.message.includes(CRASH_MESSAGE)) {
                await onCrash()
            }
            throw err
        }
    }

    async function content() {
        let content;
        try {
            content = await page.content()
        } catch (err) {
            if (err.message.includes(CRASH_MESSAGE)) {
                await onCrash()
            }
            throw err
        }

        return content
    }

    async function cookies() {
        let cookies;
        try {
            cookies = await page.cookies()
        } catch (err) {
            if (err.message.includes(CRASH_MESSAGE)) {
                await onCrash()
            }
            throw err
        }

        return cookies
    }

    async function evaluate(pageFunction, ...args) {
        try {
            return await page.evaluate(pageFunction, ...args)
        } catch (err) {
            if (err.message.includes(CRASH_MESSAGE)) {
                await onCrash()
            }
            throw err
        }
    }


    async function xhr(request) {
        return page.evaluate(function (url, method, body, headers) {
                return new Promise(resolve => {
                    const data = {
                        method, headers,
                        signal: AbortSignal.timeout(60000)
                    }

                    if (method === "POST") {
                        data["body"] = JSON.stringify(body)
                    }

                    fetch(url, data).then(response => {
                        if (response.status !== 200) {
                            resolve({"error": true, "data": response.status});
                        }

                        return response.text()
                    }).then(text => {
                        resolve({"error": false, "data": text});
                    }).catch(err => {
                        resolve({"error": true, "data": `Catched error ${err}`});
                    });
                })
            }, request.url, request.method, request.body, request.headers
        );
    }

    async function close() {
        await page.close()
    }

    return {goto, click, evaluate, close, content, cookies, xhr, pageInstance: page}
}

function makePagesRepository(makeBrowser) {
    let browser;
    let pages;

    async function getPage(tag, onCreate) {
        if (browser === undefined) {
            console.log("Starting browser")
            browser = await makeBrowser();
            pages = {};
        }

        if (pages[tag] === undefined) {
            const page = await makePage(browser, async () => {
                // При падении страницы или браузера закрывает все страницы и браузер для
                // последующего пересоздания
                console.warn("Handling page crash")
                await close();
                browser = undefined;
                pages = undefined;
            });

            try {
                await onCreate(page);
            } catch (err) {
                // Не смог выполнить onCreate скрипт от скрапера
                console.error("Unable to finish onCreate script:", err)
                await page.close();
            }

            pages[tag] = page;
        }

        return pages[tag];
    }

    async function close() {
        if (pages !== undefined) {
            for (const page of Object.values(pages)) {
                try {
                    await page.close();
                } catch (err) {
                    console.warn("Unable to properly close page:", err)
                }
            }
        }

        if (browser !== undefined) {
            try {
                await browser.close()
            } catch (err) {
                console.warn("Unable to properly close browser:", err)
            }
        }
    }

    return {
        getPage,
        close
    }
}


module.exports = makePagesRepository