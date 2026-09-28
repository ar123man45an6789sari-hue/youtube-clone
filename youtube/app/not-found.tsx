import Link from "next/link";

// shown when a url does not match any page in the app
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-red-600">404</p>
      <h1 className="text-xl font-semibold">This page does not exist</h1>
      <p className="max-w-md text-sm text-gray-500">
        The link may be old or the page may have been moved. Head back home
        and continue watching.
      </p>
      <Link
        href="/"
        className="rounded-full bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Go to Home
      </Link>
    </main>
  );
}