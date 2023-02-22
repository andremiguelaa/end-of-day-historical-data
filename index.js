require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const TICKER_TYPES = ["etf", "stock", "crypto", "ppr"];
const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData) => {
  log(colors.yellow(`Starting date: ${Object.keys(historicalData)[0]}`));
  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let filename =
    argv.type === "etf"
      ? `${argv.type}_${argv.ticker}-${argv.exchange}`
      : `${argv.type}_${argv.ticker}-${argv.currency || "EUR"}`;
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

if (
  !TICKER_TYPES.includes(argv.type) ||
  (argv.type === "etf" && (!argv.ticker || !argv.exchange)) ||
  (argv.type === "stock" && (!argv.ticker || !argv.currency)) ||
  (argv.type === "crypto" && (!argv.ticker || !argv.currency))
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
} else if (argv.type === "ppr") {
  axios
    .get(`https://casadeinvestimentos.pt/sg_indexes.php`)
    .then((response) => {
      if (response.data.Response === "Error") {
        log(colors.red(`${response.data.Message} 😖\n`));
        return;
      }
      let historicalData;
      if (argv.ticker === "PTCUUBHM0004") {
        historicalData = response.data.founders.reduce((acc, day) => {
          const date = day.x;
          acc[date] = day.y;
          return acc;
        }, {});
      }
      if (argv.ticker === "PTCUUAHM0005") {
        historicalData = response.data.prime.reduce((acc, day) => {
          const date = day.x;
          acc[date] = day.y;
          return acc;
        }, {});
      }
      if (!historicalData) {
        log(colors.red("Invalid arguments! 😖\n"));
        return;
      }
      saveFile(historicalData);
    })
    .catch((err) => {
      log(colors.red(err));
    });
} else if (argv.type === "etf") {
  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    );
    await page.goto(`https://www.investing.com/`);
    await page.focus(".topBar .topBarSearch.topBarInputSelected input");

    page.on("response", async (response) => {
      if (
        response
          .url()
          .indexOf("https://www.investing.com/search/service/searchTopBar") !==
        -1
      ) {
        const responseJson = await response.json();
        if (responseJson?.total?.quotes) {
          const exchange = responseJson.quotes.find(
            (quote) => quote.exchange === argv.exchange
          );
          if (exchange) {
            if (exchange.link.includes("?cid")) {
              const cid = exchange.link.split("cid=")[1];
              const initialDate = "1970-01-01";
              const endDate = new Date().toISOString().slice(0, 10);
              const data = await page.evaluate(
                (cid, initialDate, endDate) => {
                  return fetch(
                    `https://api.investing.com/api/financialdata/historical/${cid}?start-date=${initialDate}&end-date=${endDate}&time-frame=Daily&add-missing-rows=false`,
                    {
                      headers: {
                        "domain-id": "www",
                      },
                      method: "GET",
                    }
                  )
                    .then((response) => {
                      return response.json();
                    })
                    .catch((err) => {
                      return "error";
                    });
                },
                cid,
                initialDate,
                endDate
              );
              if (data === "error") {
                log(colors.red("Unavailable ticker! 😖\n"));
              } else {
                console.log(data);
                // TODO: PARSE DATA
              }
              await browser.close();
            } else {
              const historicalDataLink = `https://www.investing.com${exchange.link}-historical-data`;
              /*
            await page.click("#onetrust-accept-btn-handler");
            await page.waitForTimeout(5000);
            await page.evaluate((sel) => {
              var elements = document.querySelectorAll(sel);
              for (var i = 0; i < elements.length; i++) {
                elements[i].parentNode.removeChild(elements[i]);
              }
            }, ".generalOverlay, #promoAncmtPopup");

            await page.click("[class^=DatePickerWrapper_input__]");
            await page.waitForTimeout(500);
            await page.$eval(
              "[class^=NativeDateRangeInput_root__] input",
              (el) => (el.value = "1970-01-01")
            );
            // await page.keyboard.type("01/01/1970");
            page.on("response", async (response) => {
              console.log(response.url());
              if (
                response
                  .url()
                  .indexOf(
                    "https://www.investing.com/instruments/HistoricalDataAjax"
                  ) !== -1
              ) {
                const responseText = await response.text();
                const dom = new JSDOM(responseText);
                const dataRows = Array.from(
                  dom.window.document.querySelectorAll("tbody tr")
                ).reverse();
                const availableData = dataRows.reduce((acc, row) => {
                  const timestamp =
                    row.children[0].getAttribute("data-real-value");
                  const date = moment.unix(timestamp).format("YYYY-MM-DD");
                  const value = row.children[1].getAttribute("data-real-value");
                  if (timestamp) {
                    acc[date] = value;
                  }
                  return acc;
                }, {});
                const firstDate =
                  dataRows[0].children[0].getAttribute("data-real-value") ||
                  dataRows[1].children[0].getAttribute("data-real-value");
                const lastDate = moment()
                  .subtract(1, "days")
                  .endOf("day")
                  .format("X");
                let data = {};
                let date = moment.unix(firstDate).format("YYYY-MM-DD");
                let lastValue;
                while (moment(date).format("X") < lastDate) {
                  data[date] = availableData[date] || lastValue;
                  lastValue = data[date];
                  date = moment(date).add(1, "days").format("YYYY-MM-DD");
                }
                saveFile(data);
                await browser.close();
              }
            });
            await page
              .waitForSelector(
                '[class^="inv-button HistoryDatePicker_apply-button__"]'
              )
              .then(() =>
                page.click(
                  '[class^="inv-button HistoryDatePicker_apply-button__"]'
                )
              );
            */
            }
          } else {
            log(colors.red("Unavailable exchange! 😖\n"));
            await browser.close();
          }
        } else {
          log(colors.red("Unavailable ticker! 😖\n"));
          await browser.close();
        }
      }
    });

    await page.keyboard.type(argv.ticker);
  })();
} else if (argv.type === "stock") {
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
