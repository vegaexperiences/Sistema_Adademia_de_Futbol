# Panama Payments Example

Example Next.js application demonstrating how to use `@panama-payments/core` package.

## Features

- Yappy Comercial integration
- PagueloFacil integration
- API routes examples
- React components examples
- Complete payment flow examples

## Installation

```bash
npm install
npm install @panama-payments/core
```

## Configuration

Create `.env.local`:

```bash
# Yappy
YAPPY_MERCHANT_ID=your_merchant_id
YAPPY_SECRET_KEY=your_secret_key
YAPPY_DOMAIN_URL=yourdomain.com
YAPPY_ENVIRONMENT=production

# PagueloFacil
PAGUELOFACIL_ACCESS_TOKEN=your_access_token
PAGUELOFACIL_CCLW=your_cclw_code
PAGUELOFACIL_SANDBOX=false

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Usage

See example files in:
- `src/app/api/payments/` - API routes
- `src/components/payments/` - React components
- `examples/` - Standalone examples

## Documentation

- [Core Package README](../packages/panama-payments-core/README.md)
- [Quick Start Guide](../packages/panama-payments-core/docs/QUICK_START.md)
- [Configuration Guide](../packages/panama-payments-core/docs/CONFIGURATION.md)
- [Swagger API Docs](../packages/panama-payments-core/docs/swagger.yaml)



