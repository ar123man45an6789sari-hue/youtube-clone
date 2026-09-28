"use client";

// error boundary: shows a friendly card instead of a crashed white page
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
      <p className="max-w-md text-sm text-gray-500">
        An unexpected error happened while rendering this page. Your videos
        and account are safe.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Try again
      </button>
    </main>
  );
}