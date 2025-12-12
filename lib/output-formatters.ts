// =====================================================
// CRM OUTPUT FORMATTERS
// Clean, copy-paste ready formats for all major CRMs
// =====================================================

interface Participant {
  id?: string;
  name: string;
  email?: string;
  company?: string;
  role: "customer" | "sales_rep" | "other";
}

interface CallData {
  call: {
    customer_name: string | null;
    customer_company: string | null;
    sales_rep: string | null;
    call_date: string;
    duration: number | null;
    sentiment_type: string | null;
    next_steps: string | null;
    metadata?: {
      participants?: Participant[];
    };
  };
  fields: Array<{
    field_name: string;
    field_value: string | null;
    field_type?: string;
    template_id?: string | null;
  }>;
  insights: Array<{
    insight_type: string;
    insight_text: string;
  }>;
  participantAnalytics?: Array<{
    name: string;
    talkTimePercentage: number;
    wordCount: number;
    utteranceCount: number;
  }>;
}

// Helper to get field value
const getField = (fields: any[], name: string): string => {
  const field = fields.find(f =>
    f.field_name.toLowerCase() === name.toLowerCase() ||
    f.field_name.toLowerCase().replace(/_/g, ' ') === name.toLowerCase()
  );

  if (!field) return '';

  let value = field.field_value;
  if (!value) return '';

  // Parse JSON arrays into clean text
  try {
    if (value.startsWith('[')) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item).join('\n• ');
      }
    }
  } catch {}

  return value;
};

// Helper to format date
const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Clean Plain Text Format - Perfect for any CRM
export const formatPlainText = (data: CallData): string => {
  const { call, fields, insights } = data;

  // Extract key data
  const summary = getField(fields, 'summary');
  const keyPoints = getField(fields, 'key_points');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const decisionMaker = getField(fields, 'decision_maker');
  const requirements = getField(fields, 'requirements');
  const competitors = getField(fields, 'competitors_mentioned');
  const callOutcome = getField(fields, 'call_outcome');
  const urgency = getField(fields, 'urgency');

  // Format participants
  const participants = call.metadata?.participants || [];
  const participantsList = participants.length > 0
    ? participants.map(p => `  • ${p.name} (${p.role === 'sales_rep' ? 'Sales Rep' : p.role === 'customer' ? 'Customer' : 'Other'}${p.company ? `, ${p.company}` : ''}${p.email ? `, ${p.email}` : ''})`).join('\n')
    : '  • No participants recorded';

  // Format participant analytics
  const analytics = data.participantAnalytics || [];
  const analyticsText = analytics.length > 0
    ? analytics.map(a => `  • ${a.name}: ${Math.round(a.talkTimePercentage)}% talk time, ${a.wordCount} words, ${a.utteranceCount} utterances`).join('\n')
    : '';

  return `CALL SUMMARY
====================
Customer: ${call.customer_name || 'Not specified'}
Company: ${call.customer_company || getField(fields, 'customer_company') || 'Not specified'}
Date: ${formatDate(call.call_date)}
Duration: ${call.duration ? Math.ceil(call.duration / 60) : 0} minutes
Outcome: ${callOutcome || 'Not specified'}
Urgency: ${urgency || 'Not specified'}

PARTICIPANTS (${participants.length})
====================
${participantsList}
${analyticsText ? `\nCONVERSATION ANALYTICS\n====================\n${analyticsText}` : ''}

SUMMARY
====================
${summary || 'No summary available'}

KEY POINTS
====================
${keyPoints ? '• ' + keyPoints : 'No key points captured'}

PAIN POINTS
====================
${painPoints ? '• ' + painPoints : 'No pain points identified'}

REQUIREMENTS
====================
${requirements ? '• ' + requirements : 'No specific requirements noted'}

BUDGET & TIMELINE
====================
Budget: ${budget || 'Not discussed'}
Timeline: ${timeline || 'Not discussed'}
Decision Maker: ${decisionMaker || 'Not identified'}

COMPETITORS MENTIONED
====================
${competitors || 'None mentioned'}

NEXT STEPS
====================
${nextSteps ? '• ' + nextSteps : 'No next steps defined'}

FOLLOW-UP REQUIRED
====================
☐ Send follow-up email
☐ Schedule next meeting
☐ Prepare proposal
☐ Send additional information
☐ Internal team discussion`;
};

// HubSpot Format - Direct Property Mapping
export const formatHubSpot = (data: CallData): string => {
  const { call, fields, insights } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const decisionMaker = getField(fields, 'decision_maker');
  const callOutcome = getField(fields, 'call_outcome');

  // Clean budget for amount field
  const cleanBudget = budget.replace(/[^0-9]/g, '') || '0';

  // Format participants for notes
  const participants = call.metadata?.participants || [];
  const participantsText = participants.length > 0
    ? participants.map(p => `${p.name} (${p.role === 'sales_rep' ? 'Sales Rep' : p.role === 'customer' ? 'Customer' : 'Other'}${p.company ? `, ${p.company}` : ''})`).join(', ')
    : '';

  return `Deal Name: ${call.customer_name || 'Unknown'} - ${formatDate(call.call_date)}
Amount: ${cleanBudget}
Stage: ${callOutcome === 'Positive' ? 'Qualified to Buy' : 'Appointment Scheduled'}
Close Date: ${timeline || 'Q1 2025'}

Deal Description:
${summary || 'Call summary not available'}

Next Steps:
${nextSteps || 'Follow up required'}

Contact Notes:
Pain Points: ${painPoints || 'None identified'}
Decision Maker: ${decisionMaker || 'Not identified'}
Call Participants: ${participantsText || 'Not recorded'}
Call Duration: ${call.duration ? Math.ceil(call.duration / 60) : 0} minutes
Call Sentiment: ${call.sentiment_type || 'Neutral'}`;
};

// Salesforce Format - Field-by-Field
export const formatSalesforce = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const callOutcome = getField(fields, 'call_outcome');
  const urgency = getField(fields, 'urgency');

  const cleanBudget = budget.replace(/[^0-9]/g, '') || '0';

  // Format participants for notes
  const participants = call.metadata?.participants || [];
  const participantsText = participants.length > 0
    ? participants.map(p => `${p.name} (${p.role === 'sales_rep' ? 'Sales Rep' : p.role === 'customer' ? 'Customer' : 'Other'}${p.company ? `, ${p.company}` : ''})`).join(', ')
    : 'Not recorded';

  return `Opportunity Name: ${call.customer_name || 'Unknown'} - Opportunity
Amount: ${cleanBudget}
Stage: ${callOutcome === 'Positive' ? 'Qualification' : 'Prospecting'}
Close Date: ${timeline || '3 months'}
Probability: ${urgency === 'High' ? '75' : urgency === 'Medium' ? '50' : '25'}%

Description:
${summary || 'No description available'}

Next Steps:
${nextSteps || 'Follow up required'}

Key Information:
• Pain Points: ${painPoints || 'None identified'}
• Budget Range: ${budget || 'TBD'}
• Timeline: ${timeline || 'TBD'}
• Call Participants: ${participantsText}
• Call Duration: ${call.duration ? Math.floor(call.duration / 60) : 0} min
• Sentiment: ${call.sentiment_type || 'Neutral'}`;
};

// Pipedrive Format
export const formatPipedrive = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const callOutcome = getField(fields, 'call_outcome');

  return `Deal Title: ${call.customer_name || 'Unknown'} - ${formatDate(call.call_date)}
Value: ${budget || 'TBD'}
Stage: ${callOutcome === 'Positive' ? 'Qualified' : 'Contact Made'}
Expected Close: ${timeline || '90 days'}

Summary:
${summary || 'No summary available'}

Pain Points:
${painPoints || 'None identified'}

Next Actions:
${nextSteps || 'Follow up required'}

Call Details:
Duration: ${call.duration ? Math.ceil(call.duration / 60) : 0} minutes
Sentiment: ${call.sentiment_type || 'Neutral'}`;
};

// Monday.com Format
export const formatMonday = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const urgency = getField(fields, 'urgency');

  return `Item Name: ${call.customer_name || 'Unknown'} - ${formatDate(call.call_date)}

Status: ${urgency === 'High' ? '🔴 Hot Lead' : urgency === 'Medium' ? '🟡 Warm Lead' : '🔵 Cold Lead'}

Summary:
${summary || 'No summary'}

Pain Points:
${painPoints || 'None'}

Budget: ${budget || 'TBD'}
Timeline: ${timeline || 'TBD'}

Next Steps:
${nextSteps || 'Follow up'}

Notes:
Call Duration: ${call.duration ? Math.floor(call.duration / 60) : 0} min
Sentiment: ${call.sentiment_type || 'Neutral'}`;
};

// Zoho CRM Format
export const formatZoho = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const callOutcome = getField(fields, 'call_outcome');

  return `Deal Name: ${call.customer_name || 'Unknown'}
Amount: ${budget || '0'}
Stage: ${callOutcome === 'Positive' ? 'Qualification' : 'Needs Analysis'}
Closing Date: ${timeline || '3 months'}

Description:
${summary || 'No description'}

Requirements:
${painPoints || 'None identified'}

Next Steps:
${nextSteps || 'Follow up'}

Additional Info:
Call Date: ${formatDate(call.call_date)}
Duration: ${call.duration ? Math.ceil(call.duration / 60) : 0} minutes
Sentiment: ${call.sentiment_type || 'Neutral'}`;
};

// CSV Format for Excel/Sheets
export const formatCSV = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary').replace(/"/g, '""');
  const nextSteps = getField(fields, 'next_steps').replace(/"/g, '""');
  const painPoints = getField(fields, 'pain_points').replace(/"/g, '""');
  const budget = getField(fields, 'budget');
  const timeline = getField(fields, 'timeline');
  const callOutcome = getField(fields, 'call_outcome');

  const headers = 'Customer,Company,Date,Duration (min),Outcome,Budget,Timeline,Pain Points,Next Steps,Summary';
  const values = `"${call.customer_name || ''}","${call.customer_company || ''}","${formatDate(call.call_date)}","${call.duration ? Math.floor(call.duration / 60) : 0}","${callOutcome || ''}","${budget || ''}","${timeline || ''}","${painPoints}","${nextSteps}","${summary}"`;

  return `${headers}\n${values}`;
};

// Email Format - For follow-up emails
export const formatEmail = (data: CallData): string => {
  const { call, fields } = data;

  const summary = getField(fields, 'summary');
  const nextSteps = getField(fields, 'next_steps');
  const painPoints = getField(fields, 'pain_points');

  return `Subject: Follow-up: Our conversation on ${formatDate(call.call_date)}

Hi ${call.customer_name || 'there'},

Thank you for taking the time to speak with me today. I wanted to follow up on our conversation and confirm the next steps we discussed.

Key Points from Our Call:
${summary || 'We discussed your current needs and how we might be able to help.'}

Challenges You Mentioned:
${painPoints ? '• ' + painPoints : 'We discussed several areas where we could provide value.'}

Next Steps:
${nextSteps ? '• ' + nextSteps : 'As discussed, I will follow up with additional information.'}

Please let me know if I've missed anything or if you have any questions.

Best regards,
${call.sales_rep || 'Your sales representative'}`;
};

// Master formatter function
export const formatCRMOutput = (data: CallData, format: string): string => {
  switch (format.toLowerCase()) {
    case 'plain':
    case 'plaintext':
      return formatPlainText(data);
    case 'hubspot':
      return formatHubSpot(data);
    case 'salesforce':
      return formatSalesforce(data);
    case 'pipedrive':
      return formatPipedrive(data);
    case 'monday':
      return formatMonday(data);
    case 'zoho':
      return formatZoho(data);
    case 'csv':
      return formatCSV(data);
    case 'email':
      return formatEmail(data);
    default:
      return formatPlainText(data);
  }
};