# End-of-Day Historical Data

A simple Node.js script to get End of Day Historical Data for cryptos and stocks

## Setup

1. `yarn`
2. `cp .env.example .env`
3. Add your CryptoCompare API Key to `.env` (CRYPTOCOMPARE_API_KEY)

## Usage

`yarn get --type=etf --ticker=IE00B5BMR087 [--filename=my_favorite_etf]`

or

`yarn get --type=stock --ticker=AAPL --currency=EUR [--filename=my_favorite_stock]`

or

`yarn get --type=crypto --ticker=BTC --currency=EUR [--filename=my_favorite_crypto]`

or

`yarn get --type=euribor --ticker=12m [--filename=my_favorite_euribor]`

- ticker: IE00B5BMR087, AAPL, BTC, 1w, 1m, 3m, 6m, 12m, etc.
- currency: EUR, USD, CHF, GBP, etc.

## Data source

- ETFs: https://www.justetf.com/
- Stocks: https://finance.yahoo.com/
- Cryptocurrencies: https://min-api.cryptocompare.com/
- Euribor: https://www.euribor-rates.eu
