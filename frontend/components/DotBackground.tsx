export function DotBackground() {
  return (
    <>
      {/* Base Dot Pattern Background - fixed to viewport */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] z-0"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1.5px, transparent 1.5px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Gradient Accents */}
      <div className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 opacity-[0.04] z-0">
        <div className="absolute inset-0 bg-gradient-radial from-foreground to-transparent rounded-full blur-3xl" />
      </div>
    </>
  );
}
