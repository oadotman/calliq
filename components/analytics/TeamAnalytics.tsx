'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Award, Clock, Activity, UserCheck } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TeamMember {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
  lastSignIn: string | null;
  lastActive: string | null;
  isActive: boolean;
  stats: {
    totalCalls: number;
    totalDuration: number;
    avgCallDuration: number;
    activityScore: number;
    dailyActivity: Record<string, number>;
  };
  status: 'active' | 'inactive' | 'disabled';
}

interface TeamData {
  members: TeamMember[];
  metrics: {
    totalMembers: number;
    activeMembers: number;
    totalCalls: number;
    totalDuration: number;
    avgCallsPerMember: number;
    topPerformers: Array<{
      id: string;
      email: string;
      fullName: string | null;
      calls: number;
      duration: number;
    }>;
  };
  activityTrends: Array<{
    date: string;
    calls: number;
    activeUsers: number;
    duration: number;
  }>;
  seatUtilization: {
    used: number;
    limit: number;
    percentage: number;
    available: number;
  } | null;
}

export function TeamAnalytics() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeamData() {
      try {
        const response = await fetch(`/api/analytics/team?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch team data');
        const data = await response.json();
        setTeamData(data);
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamData();
  }, [period]);

  if (loading || !teamData) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-700';
      case 'disabled':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-700">
                {teamData.metrics.totalMembers}
              </span>
              <span className="text-sm text-slate-600">members</span>
            </div>
            {teamData.seatUtilization && (
              <div className="mt-2">
                <Progress value={teamData.seatUtilization.percentage} className="h-2" />
                <p className="text-xs text-slate-600 mt-1">
                  {teamData.seatUtilization.available} seats available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-700">
                {teamData.metrics.activeMembers}
              </span>
              <span className="text-sm text-slate-600">
                (
                {Math.round((teamData.metrics.activeMembers / teamData.metrics.totalMembers) * 100)}
                %)
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">Active in the last 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Avg Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-700">
                {teamData.metrics.avgCallsPerMember.toFixed(1)}
              </span>
              <span className="text-sm text-slate-600">calls/member</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Total: {teamData.metrics.totalCalls} calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trends */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Team Activity Trends</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('7d')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === '7d'
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod('30d')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === '30d'
                    ? 'bg-purple-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                30 Days
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={teamData.activityTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Line type="monotone" dataKey="calls" stroke="#8B5CF6" strokeWidth={2} name="Calls" />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#10B981"
                strokeWidth={2}
                name="Active Users"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.metrics.topPerformers.map((performer, index) => (
              <div
                key={performer.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {performer.fullName || performer.email}
                    </p>
                    <p className="text-sm text-slate-600">{performer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-slate-900">{performer.calls} calls</p>
                  <p className="text-sm text-slate-600">{formatDuration(performer.duration)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamData.members.slice(0, 10).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-100/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.fullName
                        ? member.fullName[0].toUpperCase()
                        : member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {member.fullName || member.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-slate-600">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{member.stats.totalCalls} calls</p>
                    <p className="text-sm text-slate-600">
                      {formatDuration(member.stats.totalDuration)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
