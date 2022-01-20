require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");

const TICKET_TYPES = ["stock", "crypto"];
const log = console.log;
const argv = yargs(process.argv).argv;

const saveFile = (historicalData) => {
  const dir = "./output";
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFile(
    `./output/${argv.type}_${argv.ticker}-${argv.currency}.json`,
    JSON.stringify(historicalData, null, 2),
    (err) => {
      if (err) return log(colors.red(err));
    }
  );
  log(colors.green(`Success! 😀\n`));
};

log(colors.yellow.bgBlack.underline("\nEnd of Day Historial Data\n"));

if (!argv.ticker || !TICKET_TYPES.includes(argv.type) || !argv.currency) {
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
      `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${argv.ticker}&range=100y&interval=1d`
    )
    .then((response) => {
      if (
        response.data.spark.result[0].response[0].meta.currency !==
        argv.currency
      ) {
        log(colors.red(`Quotes not available in this currency 😖\n`));
        return;
      }
      const historicalData =
        response.data.spark.result[0].response[0].indicators.quote[0].close.reduce(
          (acc, value, index) => {
            const date = moment
              .unix(response.data.spark.result[0].response[0].timestamp[index])
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
