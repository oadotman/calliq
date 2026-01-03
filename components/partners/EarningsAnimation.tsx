"use client";

import { useState, useEffect } from 'react';

export function EarningsAnimation() {
  const [averageEarnings, setAverageEarnings] = useState(0);

  useEffect(() => {
    // Calculate average earnings animation
    const target = 370;
    const increment = target / 30;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setAverageEarnings(Math.round(current));
    }, 50);

    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div className="text-4xl font-bold text-white">${averageEarnings}+</div>
      <div className="mt-2 text-blue-100">Avg Monthly Earnings*</div>
    </div>
  );
}