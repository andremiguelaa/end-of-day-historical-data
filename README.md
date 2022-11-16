# End of Day Historical Data

A simple Node.js script to get End of Day Historial Data for cryptos and stocks

## Setup

1. `yarn`
2. `cp .env.example .env`
3. Add your CryptoCompare API Key to `.env` (CRYPTOCOMPARE_API_KEY)

## Usage

`yarn get --currency=EUR --type=crypto --ticker=BTC [--filename=bitcoin]`

or

`yarn get --currency=EUR --type=etf --isin=IE00B5BMR087 [--filename=my_favorite_etf]`

- currency: EUR, USD, CHF, GBP, etc.
- type: stock, crypto, etf
- ticker: VTI, SXR8.DE, BTC, etc.
- isin: IE00B5BMR087, IE00B4L5Y983, etc.

## Data source

- Stocks: https://finance.yahoo.com/
- Cryptocurrencies: https://min-api.cryptocompare.com/
- ETFs: https://www.justetf.com/
