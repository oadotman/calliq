// =====================================================
// PARTNER RESOURCES API ENDPOINT
// Returns marketing materials and resources for partners
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyPartnerSession } from '@/lib/partners/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Sample marketing resources
const MARKETING_RESOURCES = {
  email_templates: [
    {
      id: 'email-1',
      resource_type: 'email_template',
      title: 'Introduction Email - Cold Outreach',
      description: 'Perfect for reaching out to sales teams for the first time',
      content: `Subject: Save Your Sales Team 15-20 Hours Per Week

Hi [First Name],

I noticed your sales team at [Company] is growing - congratulations!

With growth comes more meetings, and more meetings mean more time spent on CRM updates. On average, sales reps spend 20 minutes after each call updating their CRM. That's 15-20 hours per week across a typical team.

SynQall solves this with AI-powered call transcription that automatically extracts all CRM data - pain points, budget, timeline, next steps - in 60 seconds instead of 20 minutes.

The results:
• CRM completion rates jump from 65% to 95%+
• Sales reps focus on selling, not data entry
• 5-minute setup, works with any CRM

Would you be interested in a quick 15-minute demo to see how it works?

Best regards,
[Your Name]

P.S. You can learn more at [YOUR REFERRAL LINK]`,
      category: 'cold_outreach',
      download_count: 0,
      is_featured: true
    },
    {
      id: 'email-2',
      resource_type: 'email_template',
      title: 'Follow-up Email - Value Proposition',
      description: 'Send after initial contact to reinforce value',
      content: `Subject: Quick Question About Your CRM Process

Hi [First Name],

Following up on my previous email about SynQall.

I wanted to share a quick case study: One of our clients, a 50-person B2B SaaS company, was struggling with:
• Only 65% CRM completion after calls
• Sales managers couldn't get accurate pipeline data
• Reps spending 2+ hours daily on admin work

After implementing SynQall:
• 95% CRM completion automatically
• Real-time pipeline visibility
• Reps gained back 10+ hours per week for selling

The best part? It took them just 5 minutes to set up, with no IT involvement.

Would you like to see a personalized demo for your team?

[YOUR REFERRAL LINK]

Best regards,
[Your Name]`,
      category: 'follow_up',
      download_count: 0,
      is_featured: false
    },
    {
      id: 'email-3',
      resource_type: 'email_template',
      title: 'Referral Request - Existing Client',
      description: 'Ask satisfied clients for referrals',
      content: `Subject: Quick Favor - Who Else Could Benefit?

Hi [First Name],

Hope you're doing well! I've been thrilled to see how SynQall has helped your team save time and improve CRM accuracy.

I'm reaching out because I'm curious - do you know any other sales leaders who might be facing similar challenges with CRM data entry?

Many teams struggle with:
• Low CRM completion rates
• Time wasted on manual data entry
• Inaccurate pipeline reporting

If you know anyone who could benefit from saving 15-20 hours per week on CRM updates, I'd love an introduction. As a thank you, you'll receive a month of free service for each successful referral.

Just reply with their name and email, or feel free to forward this link: [YOUR REFERRAL LINK]

Thanks so much!
[Your Name]`,
      category: 'referral',
      download_count: 0,
      is_featured: true
    }
  ],
  social_posts: [
    {
      id: 'social-1',
      resource_type: 'social_post',
      title: 'LinkedIn Post - Problem/Solution',
      description: 'Highlight the problem and introduce the solution',
      content: `Sales teams lose 15-20 hours per week on CRM data entry. 📊

That's nearly half a work week spent on admin instead of selling.

SynQall changes this:
✅ Upload call recording
✅ AI extracts all CRM fields automatically
✅ 60-second update instead of 20 minutes

The result? 95%+ CRM completion rates and happier sales reps.

See how it works: [YOUR REFERRAL LINK]

#SalesAutomation #CRM #SalesProductivity #AI #SalesTech`,
      category: 'linkedin',
      download_count: 0,
      is_featured: true
    },
    {
      id: 'social-2',
      resource_type: 'social_post',
      title: 'Twitter/X Thread - Quick Stats',
      description: 'Share compelling statistics about CRM challenges',
      content: `Shocking CRM stats that every sales leader should know:

🧵 Thread:

1/ Sales reps spend 20 minutes after EVERY call updating their CRM

2/ Average CRM completion rate? Just 65% when done manually

3/ That's 15-20 hours per week of lost selling time across a team

4/ The solution? AI-powered call transcription that captures everything automatically

5/ Result: 95%+ CRM completion in 60 seconds

Stop wasting time on data entry: [YOUR REFERRAL LINK]`,
      category: 'twitter',
      download_count: 0,
      is_featured: false
    },
    {
      id: 'social-3',
      resource_type: 'social_post',
      title: 'LinkedIn Article Intro',
      description: 'Opening for a longer LinkedIn article',
      content: `Is Your Sales Team Spending More Time on Data Entry Than Selling?

If you manage a sales team, you've probably noticed a troubling pattern:

After every call, your reps disappear for 20 minutes. They're not making another call or following up with prospects. They're updating the CRM.

Multiply that by 5-10 calls per day, across your entire team, and you're looking at 15-20 hours of lost productivity every single week.

But here's the real problem: Even with all that time spent, CRM completion rates hover around 65%. Critical information gets missed. Pipeline data becomes unreliable. Forecasting becomes guesswork.

There's a better way...

[Continue reading about how SynQall solves this: YOUR REFERRAL LINK]`,
      category: 'linkedin_article',
      download_count: 0,
      is_featured: true
    }
  ],
  documents: [
    {
      id: 'doc-1',
      resource_type: 'document',
      title: 'SynQall One-Pager',
      description: 'Single page overview of SynQall features and benefits',
      file_url: '/resources/synqall-one-pager.pdf',
      file_size: 524288,
      category: 'sales_materials',
      download_count: 0,
      is_featured: true
    },
    {
      id: 'doc-2',
      resource_type: 'document',
      title: 'ROI Calculator Template',
      description: 'Help prospects calculate time and cost savings',
      file_url: '/resources/roi-calculator.xlsx',
      file_size: 102400,
      category: 'sales_tools',
      download_count: 0,
      is_featured: true
    },
    {
      id: 'video-1',
      resource_type: 'video',
      title: '2-Minute Demo Video',
      description: 'Quick demonstration of SynQall in action',
      file_url: 'https://youtube.com/watch?v=demo',
      category: 'demo',
      download_count: 0,
      is_featured: true
    },
    {
      id: 'video-2',
      resource_type: 'video',
      title: 'Customer Success Story',
      description: 'How TechCo increased CRM completion to 95%',
      file_url: 'https://youtube.com/watch?v=success',
      category: 'case_study',
      download_count: 0,
      is_featured: false
    },
    {
      id: 'image-1',
      resource_type: 'image',
      title: 'SynQall Logo Pack',
      description: 'Various logo formats for marketing materials',
      file_url: '/resources/logo-pack.zip',
      file_size: 2048000,
      category: 'branding',
      download_count: 0,
      is_featured: false
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    // Verify partner session
    const partner = await verifyPartnerSession();
    if (!partner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get partner details for personalization
    const { data: partnerData } = await supabase
      .from('partners')
      .select('id, full_name, referral_code')
      .eq('id', partner.id)
      .single();

    if (!partnerData) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://synqall.com';
    const referral_link = `${baseUrl}/?ref=${partnerData.referral_code}`;

    // Combine all resources
    const allResources = [
      ...MARKETING_RESOURCES.email_templates,
      ...MARKETING_RESOURCES.social_posts,
      ...MARKETING_RESOURCES.documents
    ];

    return NextResponse.json({
      resources: allResources,
      referral_link,
      referral_code: partnerData.referral_code,
      partner_name: partnerData.full_name,
      categories: {
        email_templates: ['cold_outreach', 'follow_up', 'referral'],
        social_posts: ['linkedin', 'twitter', 'linkedin_article'],
        documents: ['sales_materials', 'sales_tools', 'demo', 'case_study', 'branding']
      }
    });
  } catch (error) {
    console.error('Error fetching partner resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}