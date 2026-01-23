"use client";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load the dashboard content
const DashboardContent = lazy(() => import("./dashboard-content"));

// Loading fallback component
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}