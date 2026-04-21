import { useNavigate } from "react-router-dom";
import { BookOpen, ClipboardList, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { pageShell, sectionTitle } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const steps = [
  {
    icon: BookOpen,
    title: "Browse the catalog",
    body: "Explore published courses, prerequisites, and capacity — no account required.",
  },
  {
    icon: UserRound,
    title: "Sign in to enroll",
    body: "Create a student account, then request enrollment on each course page.",
  },
  {
    icon: ClipboardList,
    title: "Track your requests",
    body: "See pending, approved, or rejected status from My enrollments.",
  },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  return (
    <div className={cn(pageShell, "gap-10 pb-10")}>
      <section
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-b from-muted/60 via-background to-muted/30 px-6 py-10 text-card-foreground shadow-sm sm:px-10 sm:py-14"
        aria-labelledby="home-hero-heading"
      >
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 size-48 rounded-full bg-muted-foreground/6 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl space-y-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Student registration and enrolment system
          </p>
          <h1
            id="home-hero-heading"
            className="text-balance font-heading text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.75rem] md:leading-tight"
          >
            Course enrollment, simplified
          </h1>
          <p className="text-pretty text-base text-muted-foreground sm:text-lg">
            Browse open courses, sign in to request a seat, and follow pending,
            approved, or rejected status — all in one place.
          </p>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate("/courses")}
            >
              Browse courses
            </Button>
            {!loading && !user ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/register")}
              >
                Create account
              </Button>
            ) : null}
            {!loading && user?.role === "student" ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/enrollments")}
              >
                My enrollments
              </Button>
            ) : null}
            {!loading && user?.role === "admin" ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/admin/dashboard")}
              >
                Admin dashboard
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works-heading" className="space-y-5">
        <div className="space-y-1">
          <h2 id="how-it-works-heading" className={sectionTitle}>
            How it works
          </h2>
          <p className="text-sm text-muted-foreground">
            Three steps from browsing to tracking your enrollment requests.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full transition-colors hover:bg-muted/25">
                <CardHeader className="pb-2">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted ring-1 ring-border/60">
                    <Icon className="size-5 text-foreground" aria-hidden />
                  </div>
                  <CardTitle className="leading-snug">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
