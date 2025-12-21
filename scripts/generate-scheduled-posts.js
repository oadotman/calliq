const fs = require('fs');
const path = require('path');

// Blog posts data (posts 6-25)
const blogPosts = [
  // Week 1 (Dec 24, Dec 27)
  {
    index: 6,
    date: "2025-12-24",
    title: "The Real Reason Reps Don't Update the CRM",
    keyword: "why reps don't update crm",
    slug: "real-reason-reps-dont-update-crm",
    category: "Pain Points"
  },
  {
    index: 7,
    date: "2025-12-27",
    title: "How Manual CRM Updates Kill Sales Productivity",
    keyword: "crm updates sales productivity",
    slug: "manual-crm-updates-kill-sales-productivity",
    category: "Productivity"
  },
  // Week 2 (Dec 31, Jan 3)
  {
    index: 8,
    date: "2025-12-31",
    title: "The True Cost of a Missed CRM Update",
    keyword: "cost of bad crm data",
    slug: "true-cost-missed-crm-update",
    category: "Analytics"
  },
  {
    index: 9,
    date: "2026-01-03",
    title: "Why Your CRM Is Full of Garbage Data",
    keyword: "crm garbage data",
    slug: "why-crm-full-garbage-data",
    category: "Pain Points"
  },
  // Week 3 (Jan 7, Jan 10)
  {
    index: 10,
    date: "2026-01-07",
    title: "Sales Admin Work: How Much Is Too Much?",
    keyword: "sales admin work",
    slug: "sales-admin-work-how-much-too-much",
    category: "Productivity"
  },
  {
    index: 11,
    date: "2026-01-10",
    title: "How to Take Better Sales Call Notes",
    keyword: "sales call notes",
    slug: "how-to-take-better-sales-call-notes",
    category: "How-To"
  },
  // Week 4 (Jan 14, Jan 17)
  {
    index: 12,
    date: "2026-01-14",
    title: "How to Update Your CRM in Under 2 Minutes",
    keyword: "update crm faster",
    slug: "update-crm-under-2-minutes",
    category: "How-To"
  },
  {
    index: 13,
    date: "2026-01-17",
    title: "How to Transcribe Sales Calls for Free",
    keyword: "transcribe sales calls free",
    slug: "transcribe-sales-calls-free",
    category: "How-To"
  },
  // Week 5 (Jan 21, Jan 24)
  {
    index: 14,
    date: "2026-01-21",
    title: "How to Capture Sales Call Notes Automatically",
    keyword: "automatic sales call notes",
    slug: "capture-sales-call-notes-automatically",
    category: "Automation"
  },
  {
    index: 15,
    date: "2026-01-24",
    title: "The Ultimate Sales Call Note-Taking Template",
    keyword: "sales call note template",
    slug: "ultimate-sales-call-note-taking-template",
    category: "Templates"
  },
  // Week 6 (Jan 28, Jan 31)
  {
    index: 16,
    date: "2026-01-28",
    title: "How to Log Calls in Salesforce Faster",
    keyword: "log calls salesforce faster",
    slug: "log-calls-salesforce-faster",
    category: "Integration"
  },
  {
    index: 17,
    date: "2026-01-31",
    title: "How to Log Calls in HubSpot Automatically",
    keyword: "hubspot call logging",
    slug: "log-calls-hubspot-automatically",
    category: "Integration"
  },
  // Week 7 (Feb 4, Feb 7)
  {
    index: 18,
    date: "2026-02-04",
    title: "How to Track Sales Conversations Without Manual Entry",
    keyword: "track sales conversations",
    slug: "track-sales-conversations-without-manual-entry",
    category: "Automation"
  },
  {
    index: 19,
    date: "2026-02-07",
    title: "How to Write a Sales Call Summary That Actually Gets Used",
    keyword: "sales call summary",
    slug: "write-sales-call-summary-gets-used",
    category: "Best Practices"
  },
  // Week 8 (Feb 11, Feb 14)
  {
    index: 20,
    date: "2026-02-11",
    title: "How to Document Discovery Calls Effectively",
    keyword: "document discovery calls",
    slug: "document-discovery-calls-effectively",
    category: "How-To"
  },
  {
    index: 21,
    date: "2026-02-14",
    title: "How to Capture Buyer Pain Points During Calls",
    keyword: "capture buyer pain points",
    slug: "capture-buyer-pain-points-during-calls",
    category: "Sales Strategy"
  },
  // Week 9 (Feb 18, Feb 21)
  {
    index: 22,
    date: "2026-02-18",
    title: "How to Track Competitors Mentioned in Sales Calls",
    keyword: "track competitors sales calls",
    slug: "track-competitors-mentioned-sales-calls",
    category: "Competitive Intelligence"
  },
  {
    index: 23,
    date: "2026-02-21",
    title: "How to Keep CRM Notes Consistent Across Your Team",
    keyword: "consistent crm notes",
    slug: "keep-crm-notes-consistent-across-team",
    category: "Team Management"
  },
  // Week 10 (Feb 25, Feb 28)
  {
    index: 24,
    date: "2026-02-25",
    title: "How to Extract Action Items from Sales Calls",
    keyword: "extract action items sales calls",
    slug: "extract-action-items-sales-calls",
    category: "Productivity"
  },
  {
    index: 25,
    date: "2026-02-28",
    title: "How to Remember Everything from a Sales Call",
    keyword: "remember sales call details",
    slug: "remember-everything-sales-call",
    category: "How-To"
  }
];

console.log(`📅 Generating ${blogPosts.length} scheduled blog posts...`);
console.log(`Starting from December 24, 2025 (next Tuesday after today)\n`);

blogPosts.forEach(post => {
  const filename = `${post.slug}.mdx`;
  const filepath = path.join(__dirname, '..', 'content', 'blog', filename);

  // Check if file already exists
  if (fs.existsSync(filepath)) {
    console.log(`⚠️  Skipping ${filename} (already exists)`);
    return;
  }

  console.log(`📝 Creating: ${filename} (scheduled for ${post.date})`);
  // File will be created by the main script
  console.log(`   Title: ${post.title}`);
  console.log(`   Keyword: ${post.keyword}`);
  console.log(`   Category: ${post.category}`);
  console.log('');
});

console.log(`\n✅ Schedule complete! Posts will automatically appear on their scheduled dates.`);
console.log(`\n📊 Publishing Schedule:`);
console.log(`- Today (Dec 20): 5 posts published immediately`);
console.log(`- Dec 24 - Feb 28: 2 posts per week (Tuesdays & Fridays)`);
console.log(`- Total: 25 high-value SEO-optimized blog posts`);

module.exports = blogPosts;