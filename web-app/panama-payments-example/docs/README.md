# Panama Payments Documentation

This directory contains documentation for the Panama Payments system.

## Files

- `swagger.yaml` - OpenAPI 3.0 specification (located in `packages/panama-payments-core/docs/`)
- See parent directory `packages/panama-payments-core/docs/` for:
  - `QUICK_START.md` - Quick start guide
  - `CONFIGURATION.md` - Configuration guide
  - `swagger.yaml` - API documentation

## Viewing Swagger Documentation

You can view the Swagger documentation using:

1. **Swagger UI**: https://editor.swagger.io/ (paste swagger.yaml content)
2. **Redoc**: https://redocly.com/ (paste swagger.yaml content)
3. **Local server**: Use tools like `swagger-ui-serve` or `redoc-cli`

## API Endpoints

All endpoints are documented in `swagger.yaml`. Key endpoints:

### Yappy
- `POST /api/payments/yappy/validate` - Validate merchant
- `POST /api/payments/yappy/order` - Create order
- `POST /api/payments/yappy/callback` - Payment callback

### PagueloFacil
- `POST /api/payments/paguelofacil/link` - Create payment link
- `GET /api/payments/paguelofacil/callback` - Payment callback
- `POST /api/payments/paguelofacil/webhook` - Webhook handler
- `POST /api/payments/paguelofacil/tokenize` - Tokenize card
- `POST /api/payments/paguelofacil/process` - Process payment



