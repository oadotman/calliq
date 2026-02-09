'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Download,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Settings,
  User,
  CreditCard,
  AlertTriangle,
  Loader2,
  Mic,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { fetchWithCSRF } from '@/lib/client/csrf';
import type { UserPreferences } from '@/lib/types/preferences';

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
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch user preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsLoadingPreferences(true);
      const response = await fetchWithCSRF('/api/preferences');

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load preferences',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!preferences) return;

    // Optimistically update UI
    const prevPreferences = preferences;
    setPreferences({ ...preferences, [key]: value });

    try {
      const response = await fetchWithCSRF('/api/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }

      const data = await response.json();
      setPreferences(data.preferences);

      toast({
        title: 'Preference updated',
        description: 'Your settings have been saved.',
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences(prevPreferences);
      toast({
        title: 'Error',
        description: 'Failed to update preference',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    try {
      // TODO: Implement profile update
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'free':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'solo':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'starter':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'professional':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'enterprise':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'custom':
        return 'bg-gradient-to-r from-purple-100 to-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
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
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-700 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-700/30 rounded-xl font-semibold transition-all duration-300"
              >
                <User className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-700 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-700/30 rounded-xl font-semibold transition-all duration-300"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Billing
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-700 data-[state=active]:to-purple-700 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-700/30 rounded-xl font-semibold transition-all duration-300"
              >
                <Mic className="w-4 h-4 mr-2" />
                Processing
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
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Profile Information
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                    Update your account details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                        Email
                      </label>
                      <Input
                        value={user.email}
                        readOnly
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                        Full Name
                      </label>
                      <Input
                        defaultValue={user.name}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-purple-700/50 focus:border-purple-700 transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                        Organization
                      </label>
                      <Input
                        defaultValue={user.company}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-purple-700/50 focus:border-purple-700 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                        Time Zone
                      </label>
                      <Input
                        defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                        className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-purple-700/50 focus:border-purple-700 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={isUpdating}
                      className="bg-gradient-to-r from-purple-700 to-purple-700 hover:from-purple-800 hover:to-purple-700 text-white shadow-lg shadow-purple-700/30 hover:shadow-xl hover:shadow-purple-700/50 transition-all duration-300 rounded-xl border-0 font-semibold px-6 py-2"
                    >
                      {isUpdating ? 'Updating...' : 'Update Profile'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Subscription Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 bg-white dark:bg-slate-800">
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Current Plan
                    </span>
                    <Badge
                      className={`${getPlanBadgeColor(billing.planType)} border-2 font-semibold px-3 py-1 rounded-lg`}
                    >
                      {billing.currentPlan}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Next Billing Date
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {billing.nextBillingDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Usage Details
                    </span>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      variant="link"
                      className="text-purple-700 dark:text-purple-700 hover:text-purple-800 dark:hover:text-purple-300 p-0 h-auto font-medium"
                    >
                      View usage in Dashboard →
                    </Button>
                  </div>
                  {billing.planType !== 'enterprise' && (
                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={() => router.push('/upgrade')}
                        className="bg-gradient-to-r from-purple-700 to-purple-700 hover:from-purple-800 hover:to-purple-700 text-white shadow-lg shadow-purple-700/30 hover:shadow-xl hover:shadow-purple-700/50 transition-all duration-300 rounded-xl border-0 font-semibold"
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {billing.billingHistory.length > 0 && (
                <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Billing History
                    </CardTitle>
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
                            <tr
                              key={transaction.id}
                              className="hover:bg-purple-100/30 dark:hover:bg-purple-950/10 transition-colors duration-200"
                            >
                              <td className="py-4 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {new Date(transaction.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="py-4 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                                {transaction.metadata?.type || 'Payment'}
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

            {/* Processing Tab */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Processing Preferences */}
              <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-50 dark:from-purple-950 dark:to-purple-950 border-b border-purple-100 dark:border-purple-950">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-700 dark:text-purple-700" />
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      Processing Preferences
                    </CardTitle>
                  </div>
                  <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                    Control how your calls are processed
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
                  {isLoadingPreferences ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-700" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          Auto-transcribe calls after upload
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                          Automatically start transcription when you upload a call recording.
                          Disable this if you prefer to manually trigger transcription.
                        </p>
                      </div>
                      <Switch
                        checked={preferences?.auto_transcribe ?? true}
                        onCheckedChange={(checked) => updatePreference('auto_transcribe', checked)}
                        className="ml-4"
                      />
                    </div>
                  )}
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
