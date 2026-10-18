"use client";

import Timeline from "@/components/ui/timeline";

const settings = {
  textColor: "var(--color-foreground, #ffffff)",
  mutedTextColor: "var(--color-muted-foreground, #a1a1aa)",
  activeColor: "#ff5f00",
  backgroundColor: "var(--color-background, #0a0a0a)",
  duration: 1.4,
};

export default function TimelineDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  return (
    <main className="bg-background text-foreground">
      {/* Lead-in so the pinned timeline has somewhere to scroll in from. */}
      <section className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          End-to-End Workflow
        </p>
        <h1 className="max-w-[20ch] text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          The 6-Phase Engineering Lifecycle
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          We combine agile flexibility with enterprise engineering discipline to ensure every milestone is predictable and auditable.
        </p>
        <span className="mt-2 animate-bounce text-muted-foreground">&darr;</span>
      </section>

      {/* Realistic usage: custom copy, a branded accent, tuned reveal speed. */}
      <Timeline
        title="The 6-Phase Engineering Lifecycle"
        periodLabel="End-to-End Workflow"
        backgroundColor={s.backgroundColor}
        textColor={s.textColor}
        mutedTextColor={s.mutedTextColor}
        activeColor={s.activeColor}
        imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
        imageAlt="Logic Tech Engineering Team"
        duration={s.duration}
      />

      <section className="flex h-screen items-center justify-center px-6 text-center text-sm text-muted-foreground">
        From the first research note to a multi-market launch.
      </section>
    </main>
  );
}
