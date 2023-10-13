function AttentionAnimation({ className }: { className?: string }) {
  return (
    <span className={`absolute top-0 left-3 flex h-1.5 w-1.5 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-200"></span>
    </span>
  );
}

export default AttentionAnimation;
