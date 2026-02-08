export function DotBackground() {
  return (
    <>
      {/* Base Dot Pattern Background - fixed to viewport */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035] z-0"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />
    </>
  );
}
