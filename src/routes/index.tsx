import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Columns3, Filter } from "lucide-react";
import { Logo } from "@/components/flowly/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowly — Keep your work in flow" },
      {
        name: "description",
        content:
          "Flowly is a calm, lightweight Kanban board for one person. Plan tasks, move them forward, and stay focused on what matters.",
      },
      { property: "og:title", content: "Flowly — Keep your work in flow" },
      {
        property: "og:description",
        content: "A calm, lightweight personal Kanban board. Plan tasks and stay in flow.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Columns3,
    title: "Three simple columns",
    body: "To Do, In Progress, Done. No setup, no ceremony.",
  },
  {
    icon: CalendarDays,
    title: "Due dates & priority",
    body: "See what needs attention today without digging.",
  },
  {
    icon: Filter,
    title: "Filter and sort",
    body: "Narrow the board for a moment, keep your order intact.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Start flowing</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="py-16 text-center sm:py-24">
          <p className="text-sm font-medium text-primary">Clear board, clear mind.</p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            Keep your work in flow.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            Plan tasks, move them forward, and stay focused on what matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">
                Start flowing <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Log in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card-soft p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Flowly — one task at a time.
      </footer>
    </div>
  );
}
