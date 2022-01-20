# End of Day Historical Data
## Setup
1. `yarn`
2. `cp .env.example .env`
3. Add your CryptoCompare API Key to `.env` (CRYPTOCOMPARE_API_KEY)

## Usage

`yarn get --currency=EUR --type=crypto --ticker=BTC`

- currency: EUR, USD, etc.
- type: stock, crypto 
- ticker: VTI, SXR8.DE, BTC, etc.

## Data source
- Stocks: Coming soon 😅
- Cryptocurrencies: https://min-api.cryptocompare.com/