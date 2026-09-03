"use client";

import { useEffect, useState } from "react";

const getIds = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

type SubscribeButtonProps = {
  channelId: string;
};

const SubscribeButton = ({ channelId }: SubscribeButtonProps) => {
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setSubscribed(getIds("subscriptions").includes(channelId));
  }, [channelId]);

  const handleClick = () => {
    if (subscribed) {
      localStorage.setItem(
        "subscriptions",
        JSON.stringify(getIds("subscriptions").filter((x) => x !== channelId))
      );
      setSubscribed(false);
    } else {
      localStorage.setItem(
        "subscriptions",
        JSON.stringify([channelId, ...getIds("subscriptions")])
      );
      setSubscribed(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`ml-4 rounded-full px-4 py-2 text-sm font-medium ${
        subscribed
          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
          : "bg-black text-white hover:bg-gray-800"
      }`}
    >
      {subscribed ? "Subscribed ✓" : "Subscribe"}
    </button>
  );
};

export default SubscribeButton;