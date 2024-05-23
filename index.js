require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");
const lodash = require("lodash");

const TICKER_TYPES = ["etf", "stock", "crypto", "ppr", "euribor"];
const EURIBOR_TICKERS = { "1w": 5, "1m": 1, "3m": 2, "6m": 3, "12m": 4 };
const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData, fill = true) => {
  const datesAvailable = Object.keys(historicalData).sort();
  const startDate = datesAvailable[0];
  const endDate = datesAvailable[datesAvailable.length - 1];
  log(colors.yellow(`Starting date: ${startDate}`));
  log(colors.yellow(`End date: ${endDate}`));
  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  let filename;
  if (argv.filename) {
    filename = argv.filename;
  } else if (argv.type === "etf" || argv.type === "euribor") {
    filename = `${argv.type}_${argv.ticker}`;
  } else {
    filename = `${argv.type}_${argv.ticker}-${argv.currency || "EUR"}`;
  }

  let date = startDate;
  let curatedData = {};
  let lastValue;
  while (moment(date).unix() <= moment(endDate).unix()) {
    if (fill) {
      curatedData[date] = historicalData[date] || lastValue;
      if (historicalData[date]) {
        lastValue = historicalData[date];
      }
    } else {
      curatedData[date] = historicalData[date];
    }
    date = moment(date).add(1, "days").format("YYYY-MM-DD");
  }
  fs.writeFile(
    `./output/${filename}.json`,
    JSON.stringify(curatedData, null, 2),
    (err) => {
      if (err) return log(colors.red(err));
    }
  );
  log(colors.green(`Success! 😀\n`));
};

log(colors.yellow.bgBlack.underline("\nEnd of Day Historical Data\n"));

if (
  !TICKER_TYPES.includes(argv.type) ||
  (argv.type === "etf" && !argv.ticker) ||
  (argv.type === "stock" && (!argv.ticker || !argv.currency)) ||
  (argv.type === "crypto" && (!argv.ticker || !argv.currency)) ||
  (argv.type === "euribor" &&
    !Object.keys(EURIBOR_TICKERS).includes(argv.ticker))
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
} else if (argv.type === "euribor") {
  (async () => {
    const browser = await puppeteer.launch({
      headless: "new",
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
    );
    await page.goto("https://www.euribor-rates.eu/en/current-euribor-rates/");
    const dataFull = await page.evaluate(
      (argv, EURIBOR_TICKERS) => {
        return fetch(
          `https://www.euribor-rates.eu/umbraco/api/euriborpageapi/highchartsdata?series[0]=${
            EURIBOR_TICKERS[argv.ticker]
          }&minticks=915148800000&maxticks=${Date.now()}`,
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
          .catch(() => {
            return "error";
          });
      },
      argv,
      EURIBOR_TICKERS
    );
    const data12m = await page.evaluate(
      (argv, EURIBOR_TICKERS) => {
        return fetch(
          `https://www.euribor-rates.eu/umbraco/api/euriborpageapi/highchartsdata?series[0]=${
            EURIBOR_TICKERS[argv.ticker]
          }&minticks=${
            Date.now() - 365 * 24 * 60 * 60 * 1000
          }&maxticks=${Date.now()}`,
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
          .catch(() => {
            return "error";
          });
      },
      argv,
      EURIBOR_TICKERS
    );
    if (dataFull === "error" || data12m === "error") {
      log(colors.red("Error fetching data! 😖\n"));
    } else {
      const historicalDataFull = dataFull[0].Data.reduce((acc, day) => {
        const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
        acc[date] = Number(day[1]);
        return acc;
      }, {});
      const historicalData12m = data12m[0].Data.reduce((acc, day) => {
        const date = moment.unix(day[0] / 1000).format("YYYY-MM-DD");
        acc[date] = Number(day[1]);
        return acc;
      }, {});
      saveFile(lodash.merge(historicalDataFull, historicalData12m), false);
    }
    await browser.close();
  })();
} else if (argv.type === "ppr") {
  let url;
  if (argv.ticker === "PTCUUBHM0004") {
    url = `https://casa-de-investimentos-api.vercel.app/api/get-excel-data?worksheet=grafico_founders&range=B5:C10000`;
  } else if (argv.ticker === "PTCUUAHM0005") {
    url = `https://casa-de-investimentos-api.vercel.app/api/get-excel-data?worksheet=grafico_prime&range=B5:C10000`;
  } else {
    log(colors.red("Invalid arguments! 😖\n"));
    return;
  }
  axios
    .get(url)
    .then((response) => {
      const historicalData = response.data.reduce((acc, day) => {
        if (day[0]) {
          const date = moment(
            new Date(
              new Date(1900, 0, 1).getTime() +
                (day[0] - 2) * 24 * 60 * 60 * 1000
            )
          ).format("YYYY-MM-DD");
          acc[date] = day[1];
        }
        return acc;
      }, {});
      saveFile(historicalData);
    })
    .catch((err) => {
      log(colors.red(err));
    });
} else if (argv.type === "etf") {
  axios
    .get(
      `https://www.justetf.com/api/etfs/${
        argv.ticker
      }/performance-chart?locale=en&currency=${
        argv.currency || "EUR"
      }&valuesType=MARKET_VALUE&reduceData=false&includeDividends=true&dateFrom=1970-01-01&dateTo=${moment().format(
        "YYYY-MM-DD"
      )}`
    )
    .then((response) => {
      if (response?.data?.series) {
        const historicalData = response.data.series.reduce((acc, day) => {
          acc[day.date] = day.value.raw;
          return acc;
        }, {});
        saveFile(historicalData);
      } else {
        log(colors.red("Unavailable ticker! 😖\n"));
      }
    })
    .catch((err) => {
      log(colors.red(err));
    });
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
