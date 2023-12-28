require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");
const puppeteer = require("puppeteer");

const TICKER_TYPES = ["etf", "stock", "crypto", "ppr", "fund"];
const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData) => {
  const datesAvailable = Object.keys(historicalData);
  const startDate = datesAvailable[0];
  const endDate = datesAvailable[datesAvailable.length - 1];
  log(colors.yellow(`Starting date: ${startDate}`));
  log(colors.yellow(`End date: ${endDate}`));
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

  let date = startDate;
  let curatedData = {};
  let lastValue;
  while (moment(date).unix() <= moment(endDate).unix()) {
    curatedData[date] = historicalData[date] || lastValue;
    if (historicalData[date]) {
      lastValue = historicalData[date];
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
  (argv.type === "etf" && (!argv.ticker || !argv.exchange) && !argv.cid) ||
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
} else if (argv.type === "etf" || argv.type === "fund") {
  if (argv.cid) {
    (async () => {
      const cid = argv.cid;
      const initialDate = "1970-01-01";
      const endDate = new Date().toISOString().slice(0, 10);
      const browser = await puppeteer.launch({
        headless: "new",
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
      );
      await page.goto(`https://www.investing.com/`, {
        waitUntil: "networkidle0",
      });
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
            .catch(() => {
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
        const historicalData = data.data.reverse().reduce((acc, day) => {
          const date = moment.unix(day.rowDateRaw).format("YYYY-MM-DD");
          acc[date] = Number(day.last_close);
          return acc;
        }, {});
        saveFile(historicalData);
      }
      await browser.close();
    })();
  } else {
    axios
      .get(`https://api.investing.com/api/search/v2/search?q=${argv.ticker}`)
      .then((response) => {
        if (response.data?.quotes?.length > 0) {
          const exchange = response.data.quotes.find(
            (quote) => quote.exchange === argv.exchange
          );
          if (exchange) {
            if (exchange.url.includes("?cid")) {
              (async () => {
                const cid = exchange.url.split("cid=")[1];
                const initialDate = "1970-01-01";
                const endDate = new Date().toISOString().slice(0, 10);
                const browser = await puppeteer.launch({
                  headless: "new",
                });
                const page = await browser.newPage();
                await page.setUserAgent(
                  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
                );
                await page.goto(`https://www.investing.com/`, {
                  waitUntil: "networkidle0",
                });
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
                      .catch(() => {
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
                  const historicalData = data.data
                    .reverse()
                    .reduce((acc, day) => {
                      const date = moment
                        .unix(day.rowDateRaw)
                        .format("YYYY-MM-DD");
                      acc[date] = Number(day.last_close);
                      return acc;
                    }, {});
                  saveFile(historicalData);
                }
                await browser.close();
              })();
            } else {
              (async () => {
                const pairId = exchange.id;
                const browser = await puppeteer.launch({
                  headless: "new",
                });
                const page = await browser.newPage();
                await page.setUserAgent(
                  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36"
                );
                await page.goto(`https://www.investing.com/`, {
                  waitUntil: "networkidle2",
                });
                const data = await page.evaluate((pairId) => {
                  return fetch(
                    `https://api.investing.com/api/financialdata/${pairId}/historical/chart/?period=MAX&interval=P1D&pointscount=120`,
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
                }, pairId);
                if (data === "error") {
                  log(colors.red("Unavailable ticker! 😖\n"));
                } else {
                  const historicalData = data.data.reduce((acc, day) => {
                    const date = moment
                      .unix(day[0] / 1000)
                      .format("YYYY-MM-DD");
                    acc[date] = Number(day[4]);
                    return acc;
                  }, {});
                  saveFile(historicalData);
                }
                await browser.close();
              })();
            }
          } else {
            log(colors.red("Unavailable exchange! 😖\n"));
          }
        } else {
          log(colors.red("Unavailable ticker! 😖\n"));
        }
      })
      .catch((err) => {
        log(colors.red(err));
      });
  }
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
