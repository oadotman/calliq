// Blog scheduling configuration
export const BLOG_SCHEDULE = {
  // Start date for blog publishing (today - December 20, 2025)
  startDate: new Date('2025-12-20'),

  // First batch: 5 posts published immediately
  immediatePosts: 5,

  // Subsequent posts: 2 per week
  postsPerWeek: 2,

  // Days of the week to publish (0 = Sunday, 1 = Monday, etc.)
  publishDays: [2, 5], // Tuesday and Friday for best engagement
}

export function calculatePublishDate(postIndex: number): string {
  const { startDate, immediatePosts, postsPerWeek, publishDays } = BLOG_SCHEDULE

  // First 5 posts are published immediately (same date)
  if (postIndex < immediatePosts) {
    return startDate.toISOString().split('T')[0]
  }

  // Calculate week number for remaining posts
  const remainingPostIndex = postIndex - immediatePosts
  const weekNumber = Math.floor(remainingPostIndex / postsPerWeek)
  const dayInWeek = remainingPostIndex % postsPerWeek

  // Calculate the actual date
  const publishDate = new Date(startDate)
  publishDate.setDate(publishDate.getDate() + (weekNumber * 7) + (publishDays[dayInWeek] - startDate.getDay() + 7))

  return publishDate.toISOString().split('T')[0]
}

export function isPostPublished(publishDate: string): boolean {
  const today = new Date()
  const postDate = new Date(publishDate)

  // Set both dates to midnight for accurate comparison
  today.setHours(0, 0, 0, 0)
  postDate.setHours(0, 0, 0, 0)

  return postDate <= today
}

export const BLOG_TOPICS = [
  {
    title: "Why Sales Reps Hate CRM Data Entry (And What to Do About It)",
    keyword: "sales reps hate crm",
    slug: "why-sales-reps-hate-crm-data-entry",
    category: "Pain Points"
  },
  {
    title: "How Much Time Do Sales Reps Spend on Data Entry?",
    keyword: "sales rep data entry time",
    slug: "how-much-time-sales-reps-spend-on-data-entry",
    category: "Industry Insights"
  },
  {
    title: "The Hidden Cost of Incomplete CRM Data",
    keyword: "incomplete crm data",
    slug: "hidden-cost-incomplete-crm-data",
    category: "Pain Points"
  },
  {
    title: "Why Your Sales Forecasts Are Wrong (It's Your CRM Data)",
    keyword: "inaccurate sales forecasts",
    slug: "why-sales-forecasts-are-wrong-crm-data",
    category: "Analytics"
  },
  {
    title: "CRM Hygiene: Why Your Data Is Destroying Your Pipeline",
    keyword: "crm data hygiene",
    slug: "crm-hygiene-data-destroying-pipeline",
    category: "Best Practices"
  },
  {
    title: "The Real Reason Reps Don't Update the CRM",
    keyword: "why reps don't update crm",
    slug: "real-reason-reps-dont-update-crm",
    category: "Pain Points"
  },
  {
    title: "How Manual CRM Updates Kill Sales Productivity",
    keyword: "crm updates sales productivity",
    slug: "manual-crm-updates-kill-sales-productivity",
    category: "Productivity"
  },
  {
    title: "The True Cost of a Missed CRM Update",
    keyword: "cost of bad crm data",
    slug: "true-cost-missed-crm-update",
    category: "Analytics"
  },
  {
    title: "Why Your CRM Is Full of Garbage Data",
    keyword: "crm garbage data",
    slug: "why-crm-full-garbage-data",
    category: "Pain Points"
  },
  {
    title: "Sales Admin Work: How Much Is Too Much?",
    keyword: "sales admin work",
    slug: "sales-admin-work-how-much-too-much",
    category: "Productivity"
  },
  {
    title: "How to Take Better Sales Call Notes",
    keyword: "sales call notes",
    slug: "how-to-take-better-sales-call-notes",
    category: "How-To"
  },
  {
    title: "How to Update Your CRM in Under 2 Minutes",
    keyword: "update crm faster",
    slug: "update-crm-under-2-minutes",
    category: "How-To"
  },
  {
    title: "How to Transcribe Sales Calls for Free",
    keyword: "transcribe sales calls free",
    slug: "transcribe-sales-calls-free",
    category: "How-To"
  },
  {
    title: "How to Capture Sales Call Notes Automatically",
    keyword: "automatic sales call notes",
    slug: "capture-sales-call-notes-automatically",
    category: "Automation"
  },
  {
    title: "The Ultimate Sales Call Note-Taking Template",
    keyword: "sales call note template",
    slug: "ultimate-sales-call-note-taking-template",
    category: "Templates"
  },
  {
    title: "How to Log Calls in Salesforce Faster",
    keyword: "log calls salesforce faster",
    slug: "log-calls-salesforce-faster",
    category: "Integration"
  },
  {
    title: "How to Log Calls in HubSpot Automatically",
    keyword: "hubspot call logging",
    slug: "log-calls-hubspot-automatically",
    category: "Integration"
  },
  {
    title: "How to Track Sales Conversations Without Manual Entry",
    keyword: "track sales conversations",
    slug: "track-sales-conversations-without-manual-entry",
    category: "Automation"
  },
  {
    title: "How to Write a Sales Call Summary That Actually Gets Used",
    keyword: "sales call summary",
    slug: "write-sales-call-summary-gets-used",
    category: "Best Practices"
  },
  {
    title: "How to Document Discovery Calls Effectively",
    keyword: "document discovery calls",
    slug: "document-discovery-calls-effectively",
    category: "How-To"
  },
  {
    title: "How to Capture Buyer Pain Points During Calls",
    keyword: "capture buyer pain points",
    slug: "capture-buyer-pain-points-during-calls",
    category: "Sales Strategy"
  },
  {
    title: "How to Track Competitors Mentioned in Sales Calls",
    keyword: "track competitors sales calls",
    slug: "track-competitors-mentioned-sales-calls",
    category: "Competitive Intelligence"
  },
  {
    title: "How to Keep CRM Notes Consistent Across Your Team",
    keyword: "consistent crm notes",
    slug: "keep-crm-notes-consistent-across-team",
    category: "Team Management"
  },
  {
    title: "How to Extract Action Items from Sales Calls",
    keyword: "extract action items sales calls",
    slug: "extract-action-items-sales-calls",
    category: "Productivity"
  },
  {
    title: "How to Remember Everything from a Sales Call",
    keyword: "remember sales call details",
    slug: "remember-everything-sales-call",
    category: "How-To"
  },
  {
    title: "Sales Call Documentation for SaaS Companies: The Complete Guide",
    keyword: "saas sales call documentation",
    slug: "saas-sales-call-documentation",
    category: "Industry-Specific"
  },
  {
    title: "How Agencies Should Track Client Calls: The Complete System",
    keyword: "agency client call tracking",
    slug: "agency-client-call-tracking",
    category: "Industry-Specific"
  },
  {
    title: "CRM Best Practices for Real Estate Sales: The Top Producer's Guide",
    keyword: "real estate crm best practices",
    slug: "real-estate-crm-best-practices",
    category: "Industry-Specific"
  },
  {
    title: "Financial Services: Compliant Call Documentation That Protects Your Firm",
    keyword: "financial services call documentation",
    slug: "financial-services-call-documentation",
    category: "Industry-Specific"
  },
  {
    title: "How Recruiting Firms Can Log Candidate Calls Faster and Close More Placements",
    keyword: "recruiting call logging",
    slug: "recruiting-call-logging",
    category: "Industry-Specific"
  },
  {
    title: "B2B Sales Call Best Practices: The Enterprise Playbook That Wins",
    keyword: "b2b sales call best practices",
    slug: "b2b-sales-call-best-practices",
    category: "Industry-Specific"
  },
  {
    title: "Enterprise Sales: Managing Complex Deal Calls Like a Strategic Account Executive",
    keyword: "enterprise sales call management",
    slug: "enterprise-sales-call-management",
    category: "Industry-Specific"
  },
  {
    title: "How SDRs Can Save Time on Call Follow-Ups and Book More Meetings",
    keyword: "sdr call follow up",
    slug: "sdr-call-follow-up",
    category: "Industry-Specific"
  },
  {
    title: "Account Executive Time Management: A Practical Guide to Hitting 150% of Quota",
    keyword: "account executive time management",
    slug: "account-executive-time-management",
    category: "Industry-Specific"
  },
  {
    title: "Remote Sales Teams: Keeping CRM Data Clean When Everyone's Distributed",
    keyword: "remote sales team crm",
    slug: "remote-sales-team-crm",
    category: "Industry-Specific"
  },
  {
    title: "How AI Is Changing Sales Call Documentation Forever",
    keyword: "ai sales call documentation",
    slug: "ai-sales-call-documentation",
    category: "AI & Future"
  },
  {
    title: "AI for Sales: What Actually Works in 2025 (And What's Just Hype)",
    keyword: "ai for sales 2025",
    slug: "ai-for-sales-2025",
    category: "AI & Future"
  },
  {
    title: "Will AI Replace Sales Data Entry? The Answer Might Surprise You",
    keyword: "ai replace data entry",
    slug: "ai-replace-data-entry",
    category: "AI & Future"
  },
  {
    title: "How to Use AI Transcription for Sales Calls: The Complete Implementation Guide",
    keyword: "ai transcription sales",
    slug: "ai-transcription-sales",
    category: "AI & Future"
  },
  {
    title: "The Future of CRM: Less Typing, More Selling - What's Coming Next",
    keyword: "future of crm",
    slug: "future-of-crm",
    category: "AI & Future"
  },
  {
    title: "ChatGPT for Sales Notes: Does It Actually Work? (We Tested Everything)",
    keyword: "chatgpt sales notes",
    slug: "chatgpt-sales-notes",
    category: "AI & Future"
  },
  {
    title: "AI Sales Tools That Don't Require IT Approval (Start Using Today)",
    keyword: "ai sales tools no it",
    slug: "ai-sales-tools-no-it",
    category: "AI & Future"
  },
  {
    title: "How to Extract CRM Data from Call Transcripts Using AI: The Technical Guide",
    keyword: "extract crm data ai",
    slug: "extract-crm-data-ai",
    category: "AI & Future"
  },
  {
    title: "Speech-to-CRM: The New Category You Need to Know About",
    keyword: "speech to crm",
    slug: "speech-to-crm",
    category: "AI & Future"
  },
  {
    title: "The No-Integration Approach to Sales Tech: Why Standalone Tools Are Winning",
    keyword: "no integration sales tools",
    slug: "no-integration-sales-tools",
    category: "AI & Future"
  }
]