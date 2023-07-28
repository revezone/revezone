export default function Logo({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center h-10 text-xl font-mono underline font-semibold tracking-wider
    bg-clip-text text-transparent text-sky-500 bg-gradient-to-r from-sky-300 to-sky-600 decoration-cyan-100 underline-offset-2
    ${className}`}
    >
      ReveNote
    </div>
  );
}
