const fs = require('fs');
const path = require('path');

// The 20 new blog topics to add
const newTopics = [
  // Industry-Specific Topics (81-90)
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

  // AI & Future-Focused Topics (91-100)
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
];

// Read the current blog scheduler file
const schedulerPath = path.join(__dirname, '..', 'lib', 'blog-scheduler.ts');
let schedulerContent = fs.readFileSync(schedulerPath, 'utf8');

// Find the position to insert new topics (before the closing bracket of BLOG_TOPICS array)
const blogTopicsEnd = schedulerContent.lastIndexOf(']');
const lastTopicEnd = schedulerContent.lastIndexOf('}', blogTopicsEnd);

// Format new topics as TypeScript objects
const newTopicsString = newTopics.map(topic => {
  return `,
  {
    title: "${topic.title}",
    keyword: "${topic.keyword}",
    slug: "${topic.slug}",
    category: "${topic.category}"
  }`;
}).join('');

// Insert new topics before the closing bracket
schedulerContent = schedulerContent.slice(0, lastTopicEnd + 1) + newTopicsString + schedulerContent.slice(lastTopicEnd + 1);

// Write the updated content back
fs.writeFileSync(schedulerPath, schedulerContent);

console.log(`✅ Successfully added ${newTopics.length} new blog topics to the scheduler!`);
console.log('\n📝 New topics added:');
newTopics.forEach((topic, index) => {
  console.log(`${index + 81}. ${topic.title}`);
});

// Calculate publish dates for the new posts
const BLOG_SCHEDULE = {
  startDate: new Date('2025-12-20'),
  immediatePosts: 5,
  postsPerWeek: 2,
  publishDays: [2, 5] // Tuesday and Friday
};

function calculatePublishDate(postIndex) {
  const { startDate, immediatePosts, postsPerWeek, publishDays } = BLOG_SCHEDULE;

  if (postIndex < immediatePosts) {
    return startDate.toISOString().split('T')[0];
  }

  const remainingPostIndex = postIndex - immediatePosts;
  const weekNumber = Math.floor(remainingPostIndex / postsPerWeek);
  const dayInWeek = remainingPostIndex % postsPerWeek;

  const publishDate = new Date(startDate);
  publishDate.setDate(publishDate.getDate() + (weekNumber * 7) + (publishDays[dayInWeek] - startDate.getDay() + 7));

  return publishDate.toISOString().split('T')[0];
}

// Calculate when the new posts will be published
console.log('\n📅 Publishing schedule for new posts:');
const existingPosts = 76; // Current number of posts
newTopics.forEach((topic, index) => {
  const postIndex = existingPosts + index;
  const publishDate = calculatePublishDate(postIndex);
  console.log(`${publishDate}: ${topic.title}`);
});

console.log('\n✨ All posts scheduled through:', calculatePublishDate(existingPosts + newTopics.length - 1));