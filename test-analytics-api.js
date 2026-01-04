const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAnalyticsAPIs() {
  console.log('🔍 Testing Analytics APIs...\n');

  try {
    // First, let's check if we have any data in the database
    console.log('📊 Checking database for existing data...');

    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.log('❌ No organizations found in database');
      return;
    }

    const orgId = orgs[0].id;
    console.log(`✅ Found organization: ${orgs[0].name} (${orgId})\n`);

    // Check for calls data
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('id, created_at, duration_seconds, status')
      .eq('organization_id', orgId)
      .limit(5);

    console.log(`📞 Calls found: ${calls?.length || 0}`);
    if (calls && calls.length > 0) {
      console.log('Sample calls:', calls.map(c => ({
        id: c.id.substring(0, 8),
        duration: c.duration_seconds,
        status: c.status
      })));
    }

    // Check for insights
    const { data: insights, error: insightsError } = await supabase
      .from('call_insights')
      .select('id, keywords, sentiment_score')
      .eq('organization_id', orgId)
      .limit(5);

    console.log(`💡 Insights found: ${insights?.length || 0}\n`);

    // Check for agent performance metrics
    const { data: agentMetrics, error: agentError } = await supabase
      .from('agent_performance_metrics')
      .select('id, agent_type, execution_time_ms, success')
      .eq('organization_id', orgId)
      .limit(5);

    console.log(`🤖 Agent metrics found: ${agentMetrics?.length || 0}`);
    if (agentMetrics && agentMetrics.length > 0) {
      console.log('Sample metrics:', agentMetrics.map(m => ({
        agent: m.agent_type,
        time_ms: m.execution_time_ms,
        success: m.success
      })));
    }

    // Check for usage metrics
    const { data: usageMetrics, error: usageError } = await supabase
      .from('usage_metrics')
      .select('id, period_start, call_count, transcription_minutes')
      .eq('organization_id', orgId)
      .order('period_start', { ascending: false })
      .limit(3);

    console.log(`📈 Usage metrics found: ${usageMetrics?.length || 0}\n`);

    // Test the API endpoints
    console.log('🌐 Testing API Endpoints...\n');

    // Get a user session for testing
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('organization_id', orgId)
      .limit(1);

    if (!users || users.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }

    console.log(`✅ Found user: ${users[0].email}`);

    // Now test the comprehensive analytics endpoint
    console.log('\n📊 Testing /api/analytics/comprehensive...');
    try {
      const comprehensiveResponse = await fetch('http://localhost:3000/api/analytics/comprehensive', {
        headers: {
          'Cookie': `supabase-auth-token=${supabaseServiceKey}` // Simulating auth
        }
      });

      if (comprehensiveResponse.ok) {
        const data = await comprehensiveResponse.json();
        console.log('✅ Comprehensive API Response Structure:', {
          overview: data.overview ? '✓' : '✗',
          sentiment: data.sentiment ? '✓' : '✗',
          keywords: data.keywords ? '✓' : '✗',
          trends: data.trends ? '✓' : '✗',
          agents: data.agents ? '✓' : '✗',
          usage: data.usage ? '✓' : '✗',
          team: data.team ? '✓' : '✗'
        });

        if (data.overview) {
          console.log('\n📊 Overview Metrics:', {
            totalCalls: data.overview.totalCalls,
            totalDuration: `${data.overview.totalDuration} minutes`,
            avgCallDuration: `${data.overview.avgCallDuration} seconds`,
            timeSaved: `${data.overview.timeSaved} minutes`,
            activeUsers: data.overview.activeUsers
          });
        }

        if (data.sentiment) {
          console.log('\n😊 Sentiment Analysis:', {
            average: data.sentiment.average?.toFixed(2),
            distribution: data.sentiment.distribution
          });
        }

        if (data.keywords && data.keywords.top) {
          console.log('\n🏷️ Top Keywords:', data.keywords.top.slice(0, 5));
        }

        if (data.agents) {
          console.log('\n🤖 Agent Performance:', {
            successRate: `${data.agents.successRate?.toFixed(1)}%`,
            avgExecutionTime: `${data.agents.avgExecutionTime?.toFixed(0)}ms`,
            totalExecutions: data.agents.totalExecutions
          });
        }
      } else {
        console.log(`❌ Comprehensive API returned status: ${comprehensiveResponse.status}`);
      }
    } catch (apiError) {
      console.log('❌ Error calling comprehensive API:', apiError.message);
    }

    // Test performance endpoint
    console.log('\n⚡ Testing /api/analytics/performance...');
    try {
      const performanceResponse = await fetch('http://localhost:3000/api/analytics/performance?period=24h');

      if (performanceResponse.ok) {
        const data = await performanceResponse.json();
        console.log('✅ Performance API Response:', {
          totalExecutions: data.summary?.totalExecutions,
          successRate: `${data.summary?.successRate?.toFixed(1)}%`,
          avgExecutionTime: `${data.summary?.avgExecutionTime?.toFixed(0)}ms`
        });
      } else {
        console.log(`❌ Performance API returned status: ${performanceResponse.status}`);
      }
    } catch (apiError) {
      console.log('❌ Error calling performance API:', apiError.message);
    }

    // Test team endpoint
    console.log('\n👥 Testing /api/analytics/team...');
    try {
      const teamResponse = await fetch('http://localhost:3000/api/analytics/team?period=30d');

      if (teamResponse.ok) {
        const data = await teamResponse.json();
        console.log('✅ Team API Response:', {
          totalMembers: data.metrics?.totalMembers,
          activeMembers: data.metrics?.activeMembers,
          totalCalls: data.metrics?.totalCalls,
          topPerformersCount: data.metrics?.topPerformers?.length
        });
      } else {
        console.log(`❌ Team API returned status: ${teamResponse.status}`);
      }
    } catch (apiError) {
      console.log('❌ Error calling team API:', apiError.message);
    }

    console.log('\n✅ Analytics API testing complete!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testAnalyticsAPIs().then(() => {
  console.log('\n🎉 Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});