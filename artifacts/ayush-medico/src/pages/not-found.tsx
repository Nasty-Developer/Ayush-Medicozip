<<<<<<< HEAD
// 404 — Not Found page
// Shown whenever the user navigates to a URL that doesn't match any route.

import { Link } from "wouter";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      {/* Decorative number */}
      <div className="relative select-none">
        <span className="text-[120px] sm:text-[160px] font-extrabold text-primary/10 leading-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Search size={36} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Page not found
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          The page you're looking for doesn't exist, or may have been moved.
          Let's get you back on track.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <span className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white
                           text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <Home size={16} /> Go to Home
          </span>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border
                     text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2">
        Need help?{" "}
        <a href="tel:+919833273838" className="text-primary hover:underline font-medium">
          Call us at +91 98332 73838
        </a>
      </p>
=======
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
>>>>>>> 96e6827 (i;u;;;;j)
    </div>
  );
}
