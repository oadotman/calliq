# Partner Payout Workflow - Manual Process

## 📅 Monthly Payout Schedule

**When:** 1st-5th of each month
**For:** Previous month's commissions

## 🔄 Monthly Payout Process

### Step 1: Review Pending Payouts (1st of Month)
1. Go to: `/admin/partners/payouts`
2. Filter by: "Pending" status
3. Review the list of partners with commissions ≥ $100

### Step 2: Collect Payment Details
The system shows each partner's:
- Name and email
- Commission amount
- Preferred payment method (from their settings)
- PayPal email or bank details

### Step 3: Process Payments

#### For PayPal Payments:
1. Log into your PayPal account
2. Send payment to partner's PayPal email
3. Include note: "SynQall Partner Commission - [Month/Year]"
4. Save transaction ID

#### For International Bank Transfers:
1. Log into your bank
2. Initiate wire transfer
3. Include reference: "SynQall Commission - [Month/Year]"
4. Save transaction reference

### Step 4: Mark as Paid in Admin
1. Return to `/admin/partners/payouts`
2. Click "Mark Paid" for each processed payment
3. Enter transaction ID/reference
4. System automatically:
   - Updates payment status
   - Sends confirmation email to partner
   - Records payment date

## 💰 Payment Guidelines

### Eligible for Payout:
- ✅ Commission balance ≥ $100
- ✅ 30+ days since commission earned (holding period)
- ✅ Partner account is active
- ✅ Valid payment details provided

### Roll Over to Next Month:
- ❌ Commission balance < $100
- ❌ Within 30-day holding period
- ❌ Missing payment details

## 📊 Admin Dashboard Features

The Payout Management page (`/admin/partners/payouts`) shows:

1. **Summary Cards:**
   - Total Pending: Amount to be paid out
   - Partners to Pay: Number of partners
   - This Month's Total: Already paid this month
   - All-Time Paid: Historical total

2. **Payout Table:**
   - Partner details
   - Commission amount
   - Commission rate/tier
   - Number of referrals
   - Payment method preference

3. **Batch Actions:**
   - Select multiple partners
   - Export to CSV for records
   - Bulk mark as paid

## 📧 Automated Emails

The system sends these automatically:

- **To Partners:**
  - Commission approved notification (1st of month)
  - Payment confirmation (when marked as paid)

- **To You (Admin):**
  - Monthly payout reminder (1st of month)
  - List of partners awaiting payment

## 🗂️ Record Keeping

### What to Save:
1. PayPal transaction IDs
2. Bank transfer references
3. Monthly CSV exports from admin dashboard
4. Email confirmations

### Tax Considerations:
- Partners are responsible for their own taxes
- Keep records for your business expenses
- Consider sending 1099s if required (US partners over $600/year)

## 🔍 Partner Payment Preferences

Partners set their preference in `/partners/dashboard/settings`:

1. **PayPal** (most common)
   - Partner provides PayPal email
   - Instant delivery
   - Lower fees for domestic

2. **Bank Transfer** (international)
   - Partner provides:
     - Bank name
     - Account number
     - SWIFT/IBAN
   - 2-5 day delivery
   - Higher fees but better for large amounts

## ⚠️ Common Scenarios

### Partner Reaches $100 Mid-Month:
- Commission continues accumulating
- Paid on the 1st of following month
- 30-day hold still applies

### Partner Changes Payment Method:
- New method applies to next payout
- Verify details before sending payment

### Payment Fails/Returns:
1. Contact partner for updated details
2. Update in their profile
3. Retry payment
4. System tracks failed attempts

## 📈 Monthly Process Timeline

```
25th (Previous Month): Final commissions calculated
1st: Commissions approved, emails sent
1st-3rd: You review and process payments
3rd-5th: Mark as paid, confirmations sent
5th: All payments complete
```

## 💡 Tips for Smooth Operations

1. **Set Calendar Reminder:** 1st of each month
2. **Batch Process:** Do all PayPal, then all bank transfers
3. **Keep Spreadsheet:** Track payment methods and preferences
4. **Communicate:** Let partners know the monthly schedule

## 🚨 Important Notes

- The $100 minimum reduces transaction fees and admin work
- 30-day hold protects against refunds/chargebacks
- Partners can see their pending balance anytime in their dashboard
- All commission calculations are automatic - you just handle the payouts

This manual process gives you full control while the system handles all the tracking, calculations, and communications automatically!