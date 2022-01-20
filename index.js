require("dotenv").config();
const fs = require("fs");
const yargs = require("yargs/yargs");
const colors = require("colors");
const axios = require("axios");
const moment = require("moment");

const TICKET_TYPES = ["stock", "crypto"];
const log = console.log;
const argv = yargs(process.argv).argv;

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
        log(colors.red(`${response.data.Message}\n`));
        return;
      }
      const historicalData = response.data.Data.Data.reduce((acc, day) => {
        const date = moment.unix(day.time).format("YYYY-MM-DD");
        acc[date] = day.close;
        return acc;
      }, {});
      const dir = "./output";
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFile(
        `./output/${argv.type}_${argv.ticker}.json`,
        JSON.stringify(historicalData, null, 2),
        (err) => {
          if (err) return log(colors.red(err));
        }
      );
      log(colors.green(`Success!\n`));
    })
    .catch((err) => {
      log(colors.red(err));
    });
}
