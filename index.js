require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");

const TICKER_TYPES = ["stock", "crypto", "etf"];
const ETF_CURRENCIES = ["EUR", "USD", "CHF", "GBP"];
const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData) => {
  log(colors.yellow(`Starting date: ${Object.keys(historicalData)[0]}`));
  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFile(
    `./output/${argv.type}_${argv.ticker || argv.isin}-${argv.currency}.json`,
    JSON.stringify(historicalData, null, 2),
    (err) => {
      if (err) return log(colors.red(err));
    }
  );
  log(colors.green(`Success! 😀\n`));
};

log(colors.yellow.bgBlack.underline("\nEnd of Day Historial Data\n"));

if (
  !TICKER_TYPES.includes(argv.type) ||
  (argv.type === "etf" && !argv.isin) ||
  (argv.type === "stock" && !argv.ticker) ||
  (argv.type === "crypto" && !argv.ticker) ||
  !argv.currency
) {
  log(colors.red("Invalid arguments! 😖\n"));
  return;
}

if (argv.type === "crypto") {
  axios
    .get(
      `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${argv.ticker}&tsym=${argv.currency}&allData=true&api_key=${process.env.CRYPTOCOMPARE_API_KEY}`
    )
    .then((response) => {
      if (response.data.Response === "Error") {
        log(colors.red(`${response.data.Message} 😖\n`));
        return;
      }
      const historicalData = response.data.Data.Data.reduce((acc, day) => {
        const date = moment.unix(day.time).format("YYYY-MM-DD");
        acc[date] = day.close;
        return acc;
      }, {});
      saveFile(historicalData);
    })
    .catch((err) => {
      log(colors.red(err));
    });
}

if (argv.type === "stock") {
  axios
    .get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${argv.ticker}?interval=1d&range=100y`
    )
    .then((response) => {
      if (response.data.chart.result[0].meta.currency !== argv.currency) {
        log(colors.red(`Quotes not available in this currency 😖\n`));
        return;
      }
      const historicalData =
        response.data.chart.result[0].indicators.quote[0].close.reduce(
          (acc, value, index) => {
            const date = moment
              .unix(response.data.chart.result[0].timestamp[index])
              .format("YYYY-MM-DD");
            acc[date] = value;
            return acc;
          },
          {}
        );
      saveFile(historicalData);
    })
    .catch((err) => {
      log(colors.red(err));
    });
}

if (argv.type === "etf") {
  if (!ETF_CURRENCIES.includes(argv.currency)) {
    log(colors.red(`Quotes not available in this currency 😖\n`));
    return;
  }
  const currencyValue = ETF_CURRENCIES.indexOf(argv.currency);
  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(
      `https://www.justetf.com/en/etf-profile.html?0&isin=${argv.isin}#chart`
    );
    await page.waitForSelector("#CybotCookiebotDialog");
    await page.evaluate((sel) => {
      document.querySelector(sel).remove();
    }, "#CybotCookiebotDialogBodyUnderlay");
    await page.evaluate((sel) => {
      document.querySelector(sel).remove();
    }, "#CybotCookiebotDialog");

    page.on("response", async (response) => {
      if (
        response
          .url()
          .indexOf("https://www.justetf.com/style/daterangepicker.min.css") !==
        -1
      ) {
        await page.waitForTimeout(2000);
        let isValid;
        await page
          .click('[title="since inception"]')
          .then(() => {
            isValid = true;
          })
          .catch(() => {
            isValid = false;
          });
        if (isValid) {
          await page.select(
            '[name="chartPanel:chart:content:optionsPanel:selectContainer:valueType"]',
            "market_value"
          );
          await page.select(
            '[name="chartPanel:chart:content:optionsPanel:selectContainer:currencies"]',
            currencyValue.toString()
          );
          page.on("response", async (response) => {
            if (
              response
                .url()
                .indexOf(
                  "https://www.justetf.com/en/etf-profile.html?0-1.0-chartPanel-chart-content-optionsPanel-selectContainer-currencies&isin="
                ) !== -1
            ) {
              const responseText = await response.text();
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
        } else {
          log(colors.red(`Invalid ISIN 😖\n`));
          await browser.close();
        }
      }
    });
  })();
}
