"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function ROICalculator() {
  const [reps, setReps] = useState(5);
  const [callsPerWeek, setCallsPerWeek] = useState(10);
  const [minsPerCall, setMinsPerCall] = useState(15);

  // ROI Calculator Logic
  const weeklyHours = (reps * callsPerWeek * minsPerCall) / 60;
  const monthlyHours = weeklyHours * 4;
  const savedHours = monthlyHours * 0.9; // 90% time saved
  const monthlySavings = savedHours * 75; // $75/hr average

  return (
    <Card className="border-2 border-violet-200 dark:border-violet-700 shadow-2xl bg-white dark:bg-slate-950">
      <CardContent className="p-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Number of Reps
            </label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100 text-center text-xl"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Calls per Rep per Week
            </label>
            <input
              type="number"
              value={callsPerWeek}
              onChange={(e) => setCallsPerWeek(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100 text-center text-xl"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Minutes per Call (Manual)
            </label>
            <input
              type="number"
              value={minsPerCall}
              onChange={(e) => setMinsPerCall(Number(e.target.value))}
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:border-violet-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100 text-center text-xl"
              min="1"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="grid md:grid-cols-3 gap-6 text-center mb-8">
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur">
              <div className="text-5xl font-bold mb-2">{monthlyHours.toFixed(0)}</div>
              <p className="text-violet-100 text-sm font-medium">Current Hours/Month</p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur">
              <div className="text-5xl font-bold mb-2 text-yellow-300">{savedHours.toFixed(0)}</div>
              <p className="text-violet-100 text-sm font-medium">Hours Saved/Month</p>
            </div>
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur">
              <div className="text-5xl font-bold mb-2 text-emerald-300">${monthlySavings.toLocaleString()}</div>
              <p className="text-violet-100 text-sm font-medium">Saved Monthly</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-6 backdrop-blur">
            <p className="text-center text-xl font-semibold mb-2">
              🎯 SynQall reduces {monthlyHours.toFixed(0)} hours to just {(monthlyHours - savedHours).toFixed(0)} hours per month
            </p>
            <p className="text-center text-lg text-violet-100">
              That's <span className="text-yellow-300 font-bold">{savedHours.toFixed(0)} hours</span> your team can spend selling instead of data entry,
              worth <span className="text-emerald-300 font-bold">${monthlySavings.toLocaleString()}</span> monthly
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}