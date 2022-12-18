# End-of-Day Historical Data

A simple Node.js script to get End of Day Historical Data for cryptos and stocks

## Setup

1. `yarn`
2. `cp .env.example .env`
3. Add your CryptoCompare API Key to `.env` (CRYPTOCOMPARE_API_KEY)

## Usage

`yarn get --type=etf --ticker=SXR8 --exchange=Xetra [--filename=my_favorite_etf]`

or

`yarn get --type=stock --ticker=AAPL --currency=EUR [--filename=my_favorite_stock]`

or

`yarn get --type=crypto --ticker=BTC --currency=EUR [--filename=my_favorite_crypto]`

- ticker: AAPL, SXR8, BTC, etc.
- exchange: Xetra, Frankfurt, NASDAQ, etc.
- currency: EUR, USD, CHF, GBP, etc.

## Data source

- ETFs: https://www.investing.com/
- Stocks: https://finance.yahoo.com/
- Cryptocurrencies: https://min-api.cryptocompare.com/
