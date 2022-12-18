require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData) => {
  log(colors.yellow(`Starting date: ${Object.keys(historicalData)[0]}`));
  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  let filename = `${argv.type}_${argv.ticker || argv.isin}-${argv.currency}`;
  if (argv.filename) {
    filename = argv.filename;
  }
  fs.writeFile(
    `./output/${filename}.json`,
    JSON.stringify(historicalData, null, 2),
    (err) => {
      if (err) return log(colors.red(err));
    }
  );
  log(colors.green(`Success! 😀\n`));
};

log(colors.yellow.bgBlack.underline("\nEnd of Day Historical Data\n"));

if (!argv.symbol || !argv.exchange) {
  log(colors.red("Invalid arguments! 😖\n"));
  return;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
  );
  await page.goto(`https://www.investing.com/`);
  await page.focus(".topBar .topBarSearch.topBarInputSelected input");
  await page.keyboard.type(argv.symbol);

  page.on("response", async (response) => {
    if (
      response
        .url()
        .indexOf("https://www.investing.com/search/service/searchTopBar") !== -1
    ) {
      const responseJson = await response.json();
      if (responseJson?.total?.quotes) {
        const exchange = responseJson.quotes.find(
          (quote) => quote.exchange === argv.exchange
        );
        if (exchange) {
          await page.goto(
            `https://www.investing.com${exchange.link}`.replace(
              "?",
              "-historical-data?"
            )
          );
          await page.click("#onetrust-accept-btn-handler");
          await new Promise((resolve) => setTimeout(resolve, 500));
          await page.click("#flatDatePickerCanvasHol");
          await new Promise((resolve) => setTimeout(resolve, 500));
          for (let index = 0; index < 10; index++) {
            await page.keyboard.press("Backspace");
          }
          await page.keyboard.type("01/01/1970");
          page.on("response", async (response) => {
            if (
              response
                .url()
                .indexOf(
                  "https://www.investing.com/instruments/HistoricalDataAjax"
                ) !== -1
            ) {
              const responseText = await response.text();
              console.log(responseText);
              await browser.close();
              /*
              console.log('here');
              const responseText = await response.text();
              console.log(responseText);
              /*
              const parser = new DOMParser();
              const htmlDoc = parser.parseFromString(responseText, "text/html");
              console.log(htmlDoc);
              */
              /*
              const data = eval(
                responseText.split("setData(")[1].split(", false")[0]
              );
              const historicalData = data.reduce((acc, day) => {
                const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
                acc[date] = day[1];
                return acc;
              }, {});
              saveFile(historicalData);
              await browser.close();
              */
            }
          });
          await page.waitForSelector("#applyBtn").then(() => page.click("#applyBtn"));
        } else {
          log(colors.red("Unavailable exchange! 😖\n"));
          await browser.close();
        }
      } else {
        log(colors.red("Unavailable symbol! 😖\n"));
        await browser.close();
      }

      /*
      console.log('here');
      const responseText = await response.text();
      console.log(responseText);
      /*
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(responseText, "text/html");
      console.log(htmlDoc);
      */
      /*
      const data = eval(
        responseText.split("setData(")[1].split(", false")[0]
      );
      const historicalData = data.reduce((acc, day) => {
        const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
        acc[date] = day[1];
        return acc;
      }, {});
      saveFile(historicalData);
      await browser.close();
      */
    }
  });

  return;
  await page.goto(`https://www.investing.com/search/?q=${argv.symbol}`);
  await page.waitForNetworkIdle();
  const body = await page.evaluate(() => document.documentElement.outerHTML);
  const dom = new JSDOM(body);
  const document = dom.window.document;
  const exchanges = document.querySelectorAll(
    ".js-inner-all-results-quotes-wrapper .fourth"
  );
  const exchange = Array.from(exchanges).find((exchange) =>
    exchange.innerHTML.includes(argv.exchange)
  );
  if (exchange) {
    await page.goto(
      `https://www.investing.com${exchange.parentElement.getAttribute(
        "href"
      )}`.replace("?", "-historical-data?")
    );
    await page.click("#onetrust-accept-btn-handler");
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.click("#flatDatePickerCanvasHol");
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (let index = 0; index < 10; index++) {
      await page.keyboard.press("Backspace");
    }
    await page.keyboard.type("01/01/1970");

    page.on("response", async (response) => {
      if (
        response
          .url()
          .indexOf(
            "https://www.investing.com/instruments/HistoricalDataAjax"
          ) !== -1
      ) {
        const responseText = await response.text();
        console.log(responseText);
        /*
        console.log('here');
        const responseText = await response.text();
        console.log(responseText);
        /*
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(responseText, "text/html");
        console.log(htmlDoc);
        */
        /*
        const data = eval(
          responseText.split("setData(")[1].split(", false")[0]
        );
        const historicalData = data.reduce((acc, day) => {
          const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
          acc[date] = day[1];
          return acc;
        }, {});
        saveFile(historicalData);
        await browser.close();
        */
      }
    });

    await page.waitForSelector("#applyBtn").then(() => page.click("#applyBtn"));
  } else {
    log(colors.red("Unavailable symbol! 😖\n"));
    await browser.close();
  }
  // await browser.close();
  return;

  page.on("response", async (response) => {
    console.log(response.url());
    if (
      response
        .url()
        .indexOf("https://www.investing.com/search/service/searchTopBar") !== -1
    ) {
      let responseJson;
      try {
        responseJson = await response.json();
      } catch {
        console.log("here");
        await page.keyboard.type("sdgsdg");
      }
      if (!responseJson) {
        return;
      }
      let quote;
      responseJson?.quotes.forEach((item) => {
        if (item.symbol === argv.symbol && item.exchange === argv.exchange) {
          quote = item;
        }
      });
      if (quote) {
        /*
        await page.goto(
          `https://www.investing.com/${quote.link}`.replace(
            "?",
            "-historical-data?",
            { waitUntil: "networkidle2" }
          )
        );
        await page.click("#onetrust-accept-btn-handler");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await page.click("#flatDatePickerCanvasHol");
        for (let index = 0; index < 10; index++) {
          await page.keyboard.press("Backspace");
        }
        await page.keyboard.type("01/01/1970");

        /*
        page.on("response", async (response) => {
          // console.log(response);
          if (
            response
              .url()
              .indexOf(
                "https://www.investing.com/instruments/HistoricalDataAjax"
              ) !== -1
          ) {
            /*
            console.log('here');
            const responseText = await response.text();
            console.log(responseText);
            /*
            const parser = new DOMParser();
            const htmlDoc = parser.parseFromString(responseText, "text/html");
            console.log(htmlDoc);
            */
        /*
            const data = eval(
              responseText.split("setData(")[1].split(", false")[0]
            );
            const historicalData = data.reduce((acc, day) => {
              const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
              acc[date] = day[1];
              return acc;
            }, {});
            saveFile(historicalData);
            await browser.close();
          }
        });
        */
        /*
        await page
          .waitForSelector("#applyBtn")
          .then(() => page.click("#applyBtn"));
          */
      } else {
        log(colors.red("Unavailable symbol! 😖\n"));
        await browser.close();
      }
    }
  });
})();
