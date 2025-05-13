async function pause(ms) {
    await new Promise(r => setTimeout(r, ms));
}

module.exports = {
    pause: pause
};