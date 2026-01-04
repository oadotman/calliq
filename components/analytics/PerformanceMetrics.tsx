"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface PerformanceData {
  summary: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    p50ExecutionTime: number;
    p95ExecutionTime: number;
    totalCalls: number;
    avgProcessingTime: number;
  };
  statusBreakdown: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  agentStats: Array<{
    agent: string;
    executions: number;
    avgExecutionTime: number;
    successRate: number;
  }>;
  timeSeries: Array<{
    timestamp: string;
    executions: number;
    successRate: number;
    calls: number;
    errors: number;
  }>;
}

export function PerformanceMetrics() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [period, setPeriod] = useState("24h");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const response = await fetch(`/api/analytics/performance?period=${period}`);
        if (!response.ok) throw new Error("Failed to fetch performance data");
        const data = await response.json();
        setPerformanceData(data);
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [period]);

  if (loading || !performanceData) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-700">
                {performanceData.summary.successRate.toFixed(1)}%
              </span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {performanceData.summary.successfulExecutions} of {performanceData.summary.totalExecutions} executions
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Execution Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-700">
                {(performanceData.summary.avgExecutionTime / 1000).toFixed(2)}s
              </span>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              P50: {(performanceData.summary.p50ExecutionTime / 1000).toFixed(2)}s |
              P95: {(performanceData.summary.p95ExecutionTime / 1000).toFixed(2)}s
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-700">
                {performanceData.summary.totalCalls}
              </span>
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Avg processing: {performanceData.summary.avgProcessingTime.toFixed(1)}s
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Failed Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-red-700">
                {performanceData.summary.failedExecutions}
              </span>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {((performanceData.summary.failedExecutions / performanceData.summary.totalExecutions) * 100).toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          {/* Success Rate Over Time */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Success Rate Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748B"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="successRate"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Agent Performance */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData.agentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="agent" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="successRate" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Execution Volume */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>Execution Volume & Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748B"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis stroke="#64748B" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E293B",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                  />
                  <Line
                    type="monotone"
                    dataKey="executions"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    name="Executions"
                  />
                  <Line
                    type="monotone"
                    dataKey="errors"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    name="Errors"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}