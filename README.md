# Budget — Personal Finance Tracker

A mobile-friendly personal finance tracking app built with Next.js 16, React 19, TypeScript, Prisma (SQLite), and Tailwind CSS + shadcn/ui.

## Features

- **Dashboard** — Period selector (month / season / year), balance cards with trend indicators vs previous period, pie chart with expense/income toggle, recent transactions list.
- **Transactions** — Income & expense entries with date, category, amount, account, notes. Form validation on required fields. Auto-updates account balances on create/update/delete.
- **Loans & Debts** — Track money you lent (loans) and money you owe (debts), with contacts (lender/borrower), linked accounts, and payment schedules.
- **Scheduled Payments** — Plan upcoming payments with due dates and recurrence.
- **Accounts** — Multiple account types (cash, bank, credit card, savings) with running balances.
- **Categories** — 16 default categories (10 expense, 6 income) auto-seeded on first run, customizable.
- **Reports** — Period-based summaries with previous-period comparison and trend indicators.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Database**: Prisma ORM with SQLite
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts
- **Mobile-first design**: No page scroll; inner components scroll.

## Getting Started

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or desktop browser.

## Database

SQLite database stored at `db/custom.db`. Schema defined in `prisma/schema.prisma`.

To reset the database:
```bash
rm db/custom.db
npx prisma db push
```

## Project Structure

```
prisma/
  schema.prisma        # Database models
src/
  app/
    page.tsx           # Main single-page app (all tabs)
    layout.tsx
    api/
      accounts/        # CRUD for accounts
      categories/      # CRUD for categories
      transactions/    # CRUD for transactions (auto-updates balances)
      loans/           # CRUD for loans
      debts/           # CRUD for debts
      contacts/        # CRUD for contacts (lenders/borrowers)
      scheduled-payments/  # CRUD for scheduled payments
      seed/            # Seeds default categories on first run
  components/ui/       # shadcn/ui components
  lib/
    db.ts              # Prisma client singleton
```

## License

MIT
