// subscription plans config (Task 3)
export type Plan = {
  name: "Free" | "Bronze" | "Silver" | "Gold";
  price: number; // per month in INR
  quality: string;
  downloadLimit: number; // videos per day
  monthlyDownloads: number; // videos per month
  watchLimit: string; // daily watch time
  ads: string;
  premium: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: 0,
    quality: "480p",
    downloadLimit: 1,
    monthlyDownloads: 5,
    watchLimit: "2 hours / day",
    ads: "With ads",
    premium: "Limited preview only",
    features: [
      "Limited premium videos",
      "480p streaming quality",
      "1 download per day",
      "2 hours watch time per day",
      "Ads supported",
    ],
  },
  {
    name: "Bronze",
    price: 99,
    quality: "720p",
    downloadLimit: 3,
    monthlyDownloads: 40,
    watchLimit: "6 hours / day",
    ads: "Fewer ads",
    premium: "All standard videos",
    features: [
      "All videos unlocked",
      "720p streaming quality",
      "3 downloads per day",
      "6 hours watch time per day",
      "Faster streaming",
    ],
  },
  {
    name: "Silver",
    price: 199,
    quality: "1080p",
    downloadLimit: 5,
    monthlyDownloads: 90,
    watchLimit: "Unlimited",
    ads: "Ad-free",
    premium: "Priority content access",
    features: [
      "Everything in Bronze",
      "1080p streaming quality",
      "5 downloads per day",
      "Unlimited watch time",
      "Ad-free viewing",
      "Priority content access",
    ],
  },
  {
    name: "Gold",
    price: 299,
    quality: "1080p+",
    downloadLimit: 10,
    monthlyDownloads: 250,
    watchLimit: "Unlimited",
    ads: "Ad-free",
    premium: "Exclusive premium courses",
    features: [
      "Everything in Silver",
      "Offline downloads",
      "10 downloads per day",
      "Exclusive premium courses",
      "Fastest streaming",
      "Priority support",
    ],
  },
];

// billing cycles: months + discount (same numbers as the backend)
export type Cycle = "monthly" | "quarterly" | "yearly";

export const CYCLES: { id: Cycle; label: string; months: number; discount: number }[] = [
  { id: "monthly", label: "Monthly", months: 1, discount: 0 },
  { id: "quarterly", label: "Quarterly (10% off)", months: 3, discount: 0.1 },
  { id: "yearly", label: "Yearly (20% off)", months: 12, discount: 0.2 },
];

// final payable amount of a plan for a billing cycle
export const cyclePrice = (monthly: number, cycle: Cycle) => {
  const info = CYCLES.find((c) => c.id === cycle) || CYCLES[0];
  return Math.round(monthly * info.months * (1 - info.discount));
};

export const cycleMonths = (cycle: Cycle) =>
  (CYCLES.find((c) => c.id === cycle) || CYCLES[0]).months;
