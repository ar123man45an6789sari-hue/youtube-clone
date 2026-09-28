// skeleton shown while page data is loading (YouTube-style shimmer)
export default function Loading() {
  return (
    <main className="space-y-4 p-4 sm:p-6">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-neutral-800"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-video w-full animate-pulse rounded-xl bg-gray-200 dark:bg-neutral-800" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </main>
  );
}