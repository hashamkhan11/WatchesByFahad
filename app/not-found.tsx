import Link from "next/link";
import { Watch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <Watch className="w-12 h-12 text-gray-300 mx-auto mb-4" strokeWidth={1} />
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">
          This page doesn&apos;t exist. Maybe the watch sold out? 😅
        </p>
        <Link href="/" className="btn-primary inline-block">
          Back to Shop
        </Link>
      </div>
    </div>
  );
}
