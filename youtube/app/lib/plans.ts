// subscription plans config (Task 3)
export type Plan = {
  name: "Free" | "Bronze" | "Silver" | "Gold";
  price: number; // per month in INR
  quality: string;
  downloadLimit: number; // videos per day
  features: string[];
};

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: 0,
    quality: "480p",
    downloadLimit: 1,
    features: [
      "Limited premium videos",
      "480p streaming quality",
      "1 download per day",
      "Ads supported",
    ],
  },
  {
    name: "Bronze",
    price: 99,
    quality: "720p",
    downloadLimit: 3,
    features: [
      "All videos unlocked",
      "720p streaming quality",
      "3 downloads per day",
      "Faster streaming",
    ],
  },
  {
    name: "Silver",
    price: 199,
    quality: "1080p",
    downloadLimit: 5,
    features: [
      "Everything in Bronze",
      "1080p streaming quality",
      "5 downloads per day",
      "Ad-free viewing",
      "Priority content access",
    ],
  },
  {
    name: "Gold",
    price: 299,
    quality: "1080p+",
    downloadLimit: 10,
    features: [
      "Everything in Silver",
      "Offline downloads",
      "10 downloads per day",
      "Exclusive premium courses",
      "Fastest streaming",
    ],
  },
];