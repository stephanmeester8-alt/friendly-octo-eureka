# SnapTask Phase notes

## Fase 1 — Auth & schema

See previous sections in git history / PR #17: Supabase keys, BIGINT cents schema, Google Auth.

## Fase 2 — Wallet & micro-tegoed (Stripe)

### Model (PSD3-aware)
Klanten kopen **platform credits** via Stripe Checkout. Geld landt op de centrale platformrekening. Het `profiles.balance`-veld wordt geëmuleerd (+500 bij €5). Dit is **geen** e-money wallet / gestald fiat.

### Env
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # webhook only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### SQL
Run `supabase/migrations/002_credit_purchases.sql` (idempotente ledger per Stripe session).

### Local webhook forwarding
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Flow
1. Dashboard → **Wallet opwaarderen (€5,00)** → `POST /api/checkout`
2. Stripe Checkout Session (`metadata.profile_id`, `credit_cents=500`)
3. `checkout.session.completed` → `POST /api/webhooks/stripe`
4. Service role: insert `credit_purchases` + increment `profiles.balance`

### Demo
Zonder Stripe-keys: dezelfde knop crediteert direct +500 in de in-memory demo store.
