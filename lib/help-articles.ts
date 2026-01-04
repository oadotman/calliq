export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  slug: string;
}

export const helpArticles: HelpArticle[] = [
  // Getting Started
  {
    id: "upload-first-call",
    title: "How to upload your first call",
    category: "Getting Started",
    slug: "upload-first-call",
    content: `
# How to Upload Your First Call

Uploading calls to SynQall is quick and easy. Follow these steps to get started:

## Step 1: Navigate to the Dashboard
After logging in, you'll be taken to your dashboard. Click the **"Upload Call"** button in the top navigation or the prominent upload button on the dashboard.

## Step 2: Select Your Audio File
Click the upload area or drag and drop your audio file. We support:
- **MP3** files (recommended)
- **WAV** files
- **M4A** files
- **MP4** files (audio only)
- Maximum file size: 500MB
- Maximum duration: 4 hours

## Step 3: Add Call Details (Optional)
While your file uploads, you can add:
- **Customer Name**: The name of the person on the call
- **Customer Email**: Their contact email
- **Call Date**: When the call took place
- **Call Type**: Sales call, support call, etc.

## Step 4: Choose a Template
Select which CRM template to use for data extraction. This determines what information will be pulled from the call.

## Step 5: Process the Call
Click **"Process Call"** to begin transcription and data extraction. Processing typically takes 2-5 minutes depending on call length.

## Tips for Best Results
- Ensure good audio quality for accurate transcription
- Upload calls immediately after they happen for best organization
- Add customer details to make searching easier later
    `
  },
  {
    id: "understanding-templates",
    title: "Understanding your CRM templates",
    category: "Getting Started",
    slug: "understanding-templates",
    content: `
# Understanding Your CRM Templates

Templates in SynQall determine what information is extracted from your calls and how it's formatted for your CRM.

## What are Templates?
Templates are pre-configured sets of fields that match your CRM's data structure. When a call is processed, SynQall uses AI to extract information and populate these fields.

## Available Templates

### HubSpot Template
Perfect for HubSpot users, extracts:
- Contact information
- Deal stage indicators
- Follow-up requirements
- Pain points and objections
- Budget discussions

### Salesforce Template
Optimized for Salesforce, captures:
- Lead qualification data
- Opportunity details
- Activity summaries
- Next steps
- Decision criteria

### Pipedrive Template
Designed for Pipedrive users, includes:
- Person and organization data
- Deal probability indicators
- Activity notes
- Product interests
- Timeline expectations

## Choosing the Right Template
Select the template that matches your CRM system. If you're not sure, start with the Generic template and customize it later.

## Custom Fields
Each template can be customized to include additional fields specific to your business needs. Contact support for help with customization.
    `
  },
  {
    id: "quick-start",
    title: "Quick start guide",
    category: "Getting Started",
    slug: "quick-start",
    content: `
# Quick Start Guide

Get up and running with SynQall in just 5 minutes!

## 1. Complete Your Profile
- Add your organization name
- Set your timezone
- Configure notification preferences

## 2. Upload Your First Call
- Click **"Upload Call"** from the dashboard
- Select or drag in your audio file
- Add basic call information
- Click **"Process Call"**

## 3. Review the Results
Once processing completes (2-5 minutes):
- View the full transcript
- Check extracted data fields
- Review AI-generated insights
- Export to your CRM

## 4. Set Up Integrations (Optional)
Connect your CRM for automatic data sync:
- Go to Settings → Integrations
- Select your CRM platform
- Follow the connection instructions
- Test the integration

## 5. Invite Team Members
Collaborate with your team:
- Navigate to Team settings
- Click **"Invite Member"**
- Enter their email address
- Assign appropriate role (Admin/Member)

## Pro Tips
- **Batch Upload**: Process multiple calls at once by uploading them sequentially
- **Keyboard Shortcuts**: Press 'U' to upload, 'D' for dashboard
- **Quick Search**: Use the global search (Ctrl/Cmd + K) to find any call
- **Templates**: Create custom templates for different call types

## Need Help?
- Check our [Help Center](/help)
- Email support@synqall.com
- Use the in-app chat widget
    `
  },

  // Templates & Formatting
  {
    id: "creating-templates",
    title: "Creating custom templates",
    category: "Templates & Formatting",
    slug: "creating-templates",
    content: `
# Creating Custom Templates

Custom templates allow you to extract exactly the information you need from your calls.

## Creating a New Template

### Step 1: Access Template Manager
Navigate to **Settings → Templates** and click **"Create New Template"**.

### Step 2: Define Basic Information
- **Template Name**: Give it a descriptive name
- **Description**: Explain what this template is for
- **Category**: Group similar templates together

### Step 3: Add Fields
Click **"Add Field"** for each piece of information you want to extract:

#### Field Types:
- **Text**: Free-form text (names, comments)
- **Number**: Numeric values (budget, quantity)
- **Date**: Date and time values
- **Boolean**: Yes/No fields
- **Select**: Predefined options
- **Multi-select**: Multiple choice options

#### Field Properties:
- **Field Name**: Internal identifier
- **Display Label**: What users see
- **Description**: Help text for the field
- **Required**: Whether this field must be filled
- **Default Value**: Pre-populated value

### Step 4: Set Extraction Rules
For each field, provide extraction hints:
- Keywords to look for
- Context clues
- Example values
- Validation rules

### Step 5: Test Your Template
Upload a sample call and verify the extraction works correctly.

## Best Practices
- Start simple and add fields as needed
- Use clear, descriptive field names
- Provide examples for complex fields
- Group related fields together
- Test with multiple call types
    `
  },
  {
    id: "editing-mappings",
    title: "Editing field mappings",
    category: "Templates & Formatting",
    slug: "editing-mappings",
    content: `
# Editing Field Mappings

Field mappings determine how extracted data connects to your CRM fields.

## Understanding Field Mappings
Field mappings create a bridge between SynQall's extracted data and your CRM's field structure.

## How to Edit Mappings

### 1. Access Field Mappings
Go to **Settings → Templates**, select your template, and click **"Edit Mappings"**.

### 2. Map SynQall Fields to CRM Fields
For each SynQall field:
1. Select the corresponding CRM field from the dropdown
2. Set any transformation rules if needed
3. Configure sync behavior (create, update, or both)

### 3. Transformation Rules
Apply transformations to match your CRM's requirements:
- **Text Case**: Convert to uppercase, lowercase, or title case
- **Date Format**: Adjust date formatting (MM/DD/YYYY, DD/MM/YYYY, etc.)
- **Number Format**: Set decimal places, currency symbols
- **Concatenation**: Combine multiple fields
- **Conditional Logic**: Apply if/then rules

## Advanced Mapping Features

### Custom Formula Fields
Create calculated fields using formulas:
- Combine first and last names
- Calculate deal values
- Set status based on conditions

### Lookup Fields
Map to CRM lookup fields:
- Match company names to existing accounts
- Link contacts to organizations
- Associate with campaigns or projects

### Multi-Value Fields
Handle fields with multiple values:
- Tags and labels
- Product interests
- Team members mentioned

## Testing Your Mappings
1. Process a test call
2. Review the mapped data
3. Check your CRM for correct field population
4. Adjust mappings as needed

## Troubleshooting
- **Missing Data**: Ensure field names match exactly
- **Format Errors**: Check transformation rules
- **Sync Failures**: Verify CRM permissions
    `
  },
  {
    id: "crm-formats",
    title: "Supported CRM formats",
    category: "Templates & Formatting",
    slug: "crm-formats",
    content: `
# Supported CRM Formats

SynQall supports integration with major CRM platforms and data formats.

## Direct Integrations

### HubSpot
- **Contacts**: Full contact record creation and updates
- **Deals**: Deal creation with stages and values
- **Companies**: Company association and data
- **Activities**: Call logs and notes
- **Custom Properties**: Support for custom fields

### Salesforce
- **Leads**: Lead creation and qualification
- **Contacts**: Contact management
- **Accounts**: Account data and relationships
- **Opportunities**: Opportunity tracking
- **Tasks**: Follow-up task creation
- **Custom Objects**: Support for custom objects

### Pipedrive
- **Persons**: Contact information
- **Organizations**: Company data
- **Deals**: Deal pipeline management
- **Activities**: Activity logging
- **Notes**: Call notes and summaries

## Export Formats

### CSV Export
- Standard CSV format
- Customizable column selection
- UTF-8 encoding
- Excel-compatible

### JSON Export
- Structured JSON format
- Nested data support
- API-ready format
- Bulk export capable

### Excel Export
- .XLSX format
- Multiple sheets support
- Formatted cells
- Formulas preserved

## API Integration
For custom CRM systems:
- RESTful API endpoints
- Webhook notifications
- OAuth 2.0 authentication
- Real-time sync options

## Data Field Standards
We support standard CRM fields:
- Contact Information (name, email, phone)
- Company Details (name, size, industry)
- Deal/Opportunity Data (value, stage, close date)
- Activity Records (type, date, duration, notes)
- Custom Fields (unlimited custom field support)

## Formatting Guidelines
- **Dates**: ISO 8601 format (YYYY-MM-DD)
- **Phone Numbers**: E.164 format or local format
- **Currency**: ISO 4217 currency codes
- **Email**: RFC 5322 compliant
- **URLs**: Full URLs with protocol
    `
  },

  // Billing & Plans
  {
    id: "understanding-plan",
    title: "Understanding your plan",
    category: "Billing & Plans",
    slug: "understanding-plan",
    content: `
# Understanding Your Plan

Learn about SynQall's pricing plans and what's included in each tier.

## Available Plans

### Starter Plan - $99/month
Perfect for individuals and small teams:
- **100 calls/month** included
- **2 team members**
- **Basic templates** (HubSpot, Salesforce, Pipedrive)
- **Email support**
- **CSV export**

### Professional Plan - $299/month
For growing teams:
- **500 calls/month** included
- **10 team members**
- **All templates** plus custom templates
- **Priority support**
- **API access**
- **Advanced analytics**

### Enterprise Plan - Custom Pricing
For large organizations:
- **Unlimited calls**
- **Unlimited team members**
- **Custom templates and workflows**
- **Dedicated support**
- **SLA guarantee**
- **Custom integrations**
- **On-premise option available**

## Understanding Usage

### Call Minutes
- Counted by actual audio duration
- Not processing time
- Unused minutes don't roll over
- Overage charged at $0.10/minute

### Storage
- All plans include 50GB storage
- Calls are stored for 12 months
- Transcripts stored indefinitely
- Additional storage available

### Team Members
- Each member has their own login
- Role-based permissions (Admin, Member)
- Activity tracking per member
- Shared team workspace

## Checking Your Usage
1. Go to **Settings → Billing**
2. View current month's usage
3. See remaining minutes
4. Track usage trends

## Overage Handling
- Email notification at 80% usage
- Automatic overage billing
- No service interruption
- Upgrade anytime to save on overages
    `
  },
  {
    id: "upgrading-downgrading",
    title: "Upgrading or downgrading",
    category: "Billing & Plans",
    slug: "upgrading-downgrading",
    content: `
# Upgrading or Downgrading Your Plan

Change your SynQall plan anytime to match your needs.

## Upgrading Your Plan

### When to Upgrade
Consider upgrading when:
- Consistently exceeding call limits
- Need more team members
- Require advanced features
- Want priority support

### How to Upgrade
1. Go to **Settings → Billing**
2. Click **"Change Plan"**
3. Select your new plan
4. Review the changes
5. Confirm and pay

### What Happens When You Upgrade
- **Immediate access** to new features
- **Prorated billing** for the current month
- **Keep all existing data**
- **No downtime or data loss**
- **Instant limit increases**

## Downgrading Your Plan

### Before Downgrading
Check that you won't exceed:
- Monthly call limits
- Team member limits
- Storage limits
- Feature requirements

### How to Downgrade
1. Navigate to **Settings → Billing**
2. Select **"Change Plan"**
3. Choose a lower tier
4. Review impact summary
5. Confirm the change

### What Happens When You Downgrade
- Changes take effect at next billing cycle
- Excess team members become read-only
- Advanced features become unavailable
- Data is retained but may be inaccessible
- No refunds for current period

## Plan Comparison Tool
Use our plan calculator:
1. Enter your expected monthly calls
2. Add number of team members
3. Select required features
4. Get plan recommendation

## Special Cases

### Seasonal Adjustments
- Upgrade for busy seasons
- Downgrade during slow periods
- No penalties for plan changes

### Trial Period
- 14-day free trial available
- Full feature access during trial
- No credit card required
- Automatic conversion to paid plan

## Need Help Choosing?
Contact our sales team:
- Email: sales@synqall.com
- Schedule a consultation
- Get personalized recommendations
    `
  },
  {
    id: "payment-methods",
    title: "Payment methods",
    category: "Billing & Plans",
    slug: "payment-methods",
    content: `
# Payment Methods

SynQall accepts multiple payment methods for your convenience.

## Accepted Payment Methods

### Credit Cards
We accept all major credit cards:
- **Visa**
- **Mastercard**
- **American Express**
- **Discover**
- **Diners Club**

### Debit Cards
Most debit cards with a Visa or Mastercard logo are accepted.

### Corporate Payment Options
For enterprise customers:
- **ACH transfers**
- **Wire transfers**
- **Purchase orders**
- **Invoicing** (NET 30 terms available)

## Adding a Payment Method

### Add Credit/Debit Card
1. Go to **Settings → Billing**
2. Click **"Payment Methods"**
3. Select **"Add Card"**
4. Enter card details:
   - Card number
   - Expiration date
   - CVV code
   - Billing address
5. Click **"Save Card"**

### Set Up ACH/Wire Transfer
1. Contact sales@synqall.com
2. Provide company details
3. Receive banking instructions
4. Complete verification process

## Managing Payment Methods

### Update Card Information
- Edit expiration dates
- Change billing address
- Update cardholder name

### Set Default Payment Method
1. Navigate to payment methods
2. Click **"Make Default"** on preferred method
3. Future charges use this method

### Remove Payment Method
- Cannot remove if it's the only method
- Cannot remove with active subscription
- Add new method before removing old one

## Billing Security

### PCI Compliance
- Level 1 PCI DSS compliant
- Card data encrypted
- Secure payment processing via Stripe

### Security Features
- Two-factor authentication required
- Payment change notifications
- Suspicious activity alerts
- Billing admin role separation

## Common Issues

### Payment Declined
Reasons for decline:
- Insufficient funds
- Card expired
- Incorrect billing address
- Bank security block

### How to Resolve
1. Verify card details
2. Check with your bank
3. Try alternative payment method
4. Contact support if issues persist

## Billing Cycle

### Monthly Billing
- Charged on the same date each month
- Automatic renewal
- Email receipt sent immediately
- Invoice available in dashboard

### Annual Billing (20% discount)
- Charged once per year
- Significant savings
- Same features as monthly
- Can switch to monthly anytime
    `
  },

  // Troubleshooting
  {
    id: "audio-upload-problems",
    title: "Audio upload problems",
    category: "Troubleshooting",
    slug: "audio-upload-problems",
    content: `
# Audio Upload Problems

Having trouble uploading audio files? Here are common issues and solutions.

## Common Upload Issues

### File Won't Upload

#### Check File Format
Supported formats:
- ✅ MP3 (recommended)
- ✅ WAV
- ✅ M4A
- ✅ MP4 (audio track)
- ❌ WMA (not supported)
- ❌ FLAC (convert to MP3 first)

#### Check File Size
- Maximum: 500MB
- If larger, try compressing the audio
- Use MP3 format for smaller files

#### Check File Duration
- Maximum: 4 hours
- Longer recordings must be split

### Upload Stalls or Fails

#### Internet Connection
- Check your connection speed
- Minimum 5 Mbps upload recommended
- Try wired connection if on WiFi

#### Browser Issues
Try these steps:
1. Clear browser cache
2. Disable browser extensions
3. Try incognito/private mode
4. Use Chrome or Firefox (recommended)

#### Large File Tips
- Close other browser tabs
- Pause other uploads/downloads
- Upload during off-peak hours
- Keep browser tab active

## Error Messages

### "File type not supported"
- Convert file to MP3 using free tools
- Ensure file extension is correct
- Check file isn't corrupted

### "File too large"
- Compress audio to 128kbps MP3
- Split long recordings
- Remove silence from recordings

### "Upload timeout"
- Check internet stability
- Try smaller file first
- Contact support for direct upload link

## Optimizing Audio Files

### Reduce File Size
Use free tools like:
- Audacity (desktop)
- CloudConvert (online)
- FFmpeg (command line)

Settings for compression:
- Format: MP3
- Bitrate: 128 kbps
- Sample rate: 44.1 kHz
- Channels: Mono (for calls)

### Improve Audio Quality
Before uploading:
- Remove background noise
- Normalize volume levels
- Trim dead air at start/end
- Ensure clear speech audio

## Alternative Upload Methods

### Batch Upload
For multiple files:
1. Prepare all files
2. Use batch upload feature
3. Queue processes automatically

### API Upload
For developers:
- Use our REST API
- Programmatic upload
- Automation possible

## Still Having Issues?
Contact support with:
- Error message screenshot
- File format and size
- Browser and OS version
- Time of attempted upload
    `
  },
  {
    id: "processing-errors",
    title: "Processing errors",
    category: "Troubleshooting",
    slug: "processing-errors",
    content: `
# Processing Errors

Understanding and resolving call processing errors.

## Common Processing Errors

### "Processing Failed"

#### Poor Audio Quality
**Symptoms:**
- Transcription has many [inaudible] marks
- Extracted data is incomplete
- Confidence scores are low

**Solutions:**
- Upload higher quality audio
- Ensure minimum 64 kbps bitrate
- Check for clear speech
- Reduce background noise

#### Language Issues
**Problem:** Non-English audio
**Solution:** Currently English-only support
**Workaround:** Use pre-translated transcripts

### "Processing Timeout"

#### File Too Long
- Files over 2 hours may timeout
- Split into smaller segments
- Process separately

#### System Overload
- Retry during off-peak hours
- Contact support for priority processing

### Incomplete Processing

#### Partial Transcription
**Causes:**
- Audio cuts off suddenly
- File corruption
- Format conversion issues

**Fix:**
- Re-upload original file
- Check file plays completely
- Convert to standard MP3

## Data Extraction Issues

### Missing Fields
Common reasons:
- Information not mentioned in call
- Ambiguous references
- Template mismatch

Solutions:
1. Review transcript manually
2. Add missing data manually
3. Adjust template sensitivity

### Incorrect Data
If extracted data is wrong:
1. Edit directly in SynQall
2. Report to improve AI model
3. Adjust template rules

### Low Confidence Scores
When confidence is low:
- Review and verify data
- Add context in notes
- Consider manual review

## Troubleshooting Steps

### 1. Check Processing Status
- Go to call detail page
- View processing log
- Note any error codes

### 2. Verify Audio Quality
- Download and play file
- Check entire duration
- Ensure clear audio

### 3. Review Template
- Confirm correct template selected
- Check field requirements
- Verify extraction rules

### 4. Retry Processing
- Click "Reprocess"
- Select different template if needed
- Monitor progress

## Error Codes

### ERR_AUDIO_QUALITY
- Audio below quality threshold
- Enhance audio and retry

### ERR_DURATION_LIMIT
- File exceeds time limit
- Split and process separately

### ERR_FORMAT_INVALID
- Unsupported or corrupted file
- Convert to standard MP3

### ERR_LANGUAGE_DETECT
- Non-English content detected
- English-only currently supported

### ERR_SYSTEM_OVERLOAD
- Temporary system issue
- Retry in 30 minutes

## Preventing Processing Errors

### Best Practices
- Use high-quality recording equipment
- Record in quiet environment
- Save in MP3 format
- Test with short sample first
- Keep calls under 2 hours

## Getting Help
If errors persist:
1. Note the error code
2. Save the Call ID
3. Contact support@synqall.com
4. Include file details
    `
  },
  {
    id: "missing-data",
    title: "Missing data in output",
    category: "Troubleshooting",
    slug: "missing-data",
    content: `
# Missing Data in Output

How to handle and prevent missing data in your call extractions.

## Why Data Might Be Missing

### Not Discussed in Call
Most common reason:
- Information wasn't mentioned
- Topic wasn't covered
- Details were assumed, not stated

**Solution:** Add notes manually after review

### Unclear References
When speakers use:
- Pronouns without context ("it", "they")
- Company jargon or acronyms
- Indirect references

**Fix:** Add context in custom fields

### Audio Quality Issues
Problems that affect extraction:
- Muffled speech
- Background noise
- Multiple people talking
- Poor connection quality

**Prevention:** Use quality recording equipment

## Diagnosing Missing Data

### Step 1: Review Transcript
1. Open call details
2. Read full transcript
3. Search (Ctrl/Cmd+F) for keywords
4. Check if information exists

### Step 2: Check Confidence Scores
- Low confidence = uncertain extraction
- Review low-confidence fields
- Manually verify or correct

### Step 3: Template Analysis
Verify template is:
- Appropriate for call type
- Has all needed fields
- Properly configured

## Fixing Missing Data

### Manual Addition
1. Click "Edit" on call details
2. Fill in missing fields
3. Add notes for context
4. Save changes

### Reprocess with Different Template
1. Select "Reprocess Call"
2. Choose more suitable template
3. Review new results
4. Merge best data

### Bulk Updates
For multiple calls:
1. Export to CSV
2. Add missing data
3. Re-import updates
4. Verify changes

## Improving Data Capture

### Call Preparation
Coach your team to:
- State full names clearly
- Spell out email addresses
- Confirm important details
- Summarize key points

### Template Optimization
- Add more specific fields
- Include keyword hints
- Set required fields
- Test with sample calls

### Recording Best Practices
- Use headsets or quality mics
- Minimize background noise
- Record in quiet space
- Test audio before important calls

## Common Missing Fields

### Contact Information
**Issue:** Email/phone not captured
**Solution:** Ask speakers to state clearly
**Example:** "My email is john.doe@company.com"

### Company Details
**Issue:** Company name unclear
**Solution:** Confirm full company name
**Template Tip:** Add company aliases

### Deal Values
**Issue:** Price not mentioned explicitly
**Solution:** Prompt for specific numbers
**Best Practice:** Confirm amounts

### Next Steps
**Issue:** Vague action items
**Solution:** Summarize at call end
**Template:** Add "next steps" field

## Prevention Strategies

### Pre-Call Checklist
- Test audio quality
- Prepare key questions
- Have template ready
- Brief participants

### During Call
- Take notes of key points
- Clarify ambiguous statements
- Confirm important details
- Summarize before ending

### Post-Call
- Review immediately
- Add missing data while fresh
- Note any issues
- Adjust template if needed

## Advanced Solutions

### Custom Extraction Rules
Create rules for your specific needs:
- Industry-specific terms
- Company terminology
- Product names
- Regional variations

### AI Training Feedback
Help improve extractions:
- Report consistent misses
- Provide correction examples
- Suggest improvements

## Still Missing Data?
Contact support with:
- Call ID
- Missing fields list
- Template used
- Sample transcript section
    `
  }
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return helpArticles.find(article => article.slug === slug);
}

export function getArticlesByCategory(category: string): HelpArticle[] {
  return helpArticles.filter(article => article.category === category);
}

export function searchArticles(query: string): HelpArticle[] {
  const lowercaseQuery = query.toLowerCase();
  return helpArticles.filter(article =>
    article.title.toLowerCase().includes(lowercaseQuery) ||
    article.content.toLowerCase().includes(lowercaseQuery) ||
    article.category.toLowerCase().includes(lowercaseQuery)
  );
}