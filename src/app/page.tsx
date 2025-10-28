export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TruLoad</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Intelligent Weighing and Enforcement Solution
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/weighing"
            className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 transition"
          >
            Start Weighing
          </a>
          <a
            href="/dashboard"
            className="rounded-lg border border-border px-6 py-3 hover:bg-accent transition"
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}

