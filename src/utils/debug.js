const {makePageRepository, makeBrowserFactory} = require("../engin");

// Путь к chrome, например: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
const EXECUTABLE_PATH = "";

// Путь к профилю chrome, например: /Users/username/Documents/chrome_profiles/SomeProfile
// Если папка профиля не существует, она будет создана автоматически
const PROFILE_DIR = "";

async function debug(process, headless = false) {
    const pages = makePageRepository(makeBrowserFactory(EXECUTABLE_PATH, PROFILE_DIR, headless));

    const result = await process({getPage: pages.getPage});

    try {
        for await (let row of result) {
            console.log(row)
        }
    } finally {
        await pages.close()
    }
}

module.exports = debug
