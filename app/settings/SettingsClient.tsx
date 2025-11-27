"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, EyeOff, Copy, RefreshCw, Settings, User, CreditCard, Bell, Key, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

interface SettingsClientProps {
  user: {
    email: string;
    name: string;
    company: string;
  };
  billing: {
    currentPlan: string;
    planType: string;
    minutesUsed: number;
    minutesTotal: number;
    usagePercentage: number;
    nextBillingDate: string;
    subscriptionStatus: string;
    billingHistory: any[];
  };
  organizationId: string;
  userId: string;
}

export function SettingsClient({ user, billing, organizationId, userId }: SettingsClientProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      // TODO: Implement profile update
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case "free":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "solo":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "team_starter":
        return "bg-violet-100 text-violet-700 border-violet-200";
      case "team_pro":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "team_enterprise":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "enterprise":
        return "bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border-violet-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      <TopBar />

      <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-200">
        {/* Modern Header with Glassmorphism */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 via-gray-600/20 to-zinc-600/20 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-8 border border-white/40 dark:border-slate-700/40 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl shadow-lg shadow-slate-500/30">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 dark:from-slate-100 dark:via-gray-100 dark:to-slate-100 bg-clip-text text-transparent tracking-tight">
                  Settings
                </h1>
                <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">
                  Manage your account preferences and configuration
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="account" className="space-y-6">
            {/* Modern Tabs */}
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 p-2 rounded-2xl shadow-lg">
              <TabsTrigger
                value="account"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="api"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <Key className="w-4 h-4 mr-2" />
                API
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/30 rounded-xl font-semibold transition-all duration-300"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Danger
              </TabsTrigger>
            </TabsList>

            {/* Account Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Profile Information</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                    Update your account details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Email</label>
                      <Input
                        value={user.email}
                        readOnly
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Full Name</label>
                      <Input
                        defaultValue={user.name}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Organization</label>
                      <Input
                        defaultValue={user.company}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Time Zone</label>
                      <Input
                        defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2"
                    >
                      {isUpdating ? "Updating..." : "Update Profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Subscription Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Plan</span>
                    <Badge className={`${getPlanBadgeColor(billing.planType)} border-2 font-semibold px-3 py-1 rounded-lg`}>
                      {billing.currentPlan}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Minutes Used</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(billing.usagePercentage, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {billing.minutesUsed.toLocaleString()} / {billing.minutesTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Next Billing Date</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{billing.nextBillingDate}</span>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => router.push("/settings/billing")}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold"
                    >
                      Manage Subscription
                    </Button>
                    <Button
                      onClick={() => router.push("/#pricing")}
                      variant="outline"
                      className="border-2 border-violet-200 dark:border-violet-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 rounded-xl font-semibold transition-all duration-200"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {billing.billingHistory.length > 0 && (
                <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Billing History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 bg-white dark:bg-slate-800">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900">
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider rounded-tl-lg">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider rounded-tr-lg">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {billing.billingHistory.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors duration-200">
                              <td className="py-4 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {new Date(transaction.created_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </td>
                              <td className="py-4 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {transaction.metadata?.type || "Payment"}
                              </td>
                              <td className="py-4 px-4 text-sm">
                                <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
                                  Completed
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">Email Preferences</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                    Manage how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Call processing complete</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                        Get notified when your call recordings have been fully analyzed.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      defaultChecked
                    />
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">Weekly summary report</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                        Receive a weekly digest of your call activity and insights.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
                      defaultChecked
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2">
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">API Access</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                    API access coming soon - stay tuned!
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-white dark:bg-slate-800">
                  <p className="text-slate-600 dark:text-slate-400">
                    API functionality will be available in a future update.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger">
              <Card className="border-2 border-red-200 dark:border-red-900 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-b border-red-100 dark:border-red-900">
                  <CardTitle className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Delete Account
                  </CardTitle>
                  <CardDescription className="text-red-600/80 dark:text-red-400/80 font-medium">
                    Permanently delete your account and all associated data
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-white dark:bg-slate-800">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 font-medium leading-relaxed">
                    This action is irreversible. All your call history, insights, and custom
                    templates will be permanently deleted.
                  </p>
                  <Button className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
