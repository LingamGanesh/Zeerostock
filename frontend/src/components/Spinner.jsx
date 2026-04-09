

export default function Spinner({ message = "Loading inventory…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 animate-fade-up">
      {/* Concentric ring spinner */}
      <div className="relative w-14 h-14">
        {/* Outer ring */}
        <div className="
          absolute inset-0 rounded-full border-2 border-transparent
          border-t-indigo-500 border-r-indigo-400
          animate-spin-slow
        " />
        {/* Inner ring – counter-rotate for depth */}
        <div className="
          absolute inset-2 rounded-full border-2 border-transparent
          border-b-purple-500 border-l-purple-400
          animate-[spin_1s_linear_infinite_reverse]
        " />
        {/* Centre dot */}
        <div className="
          absolute inset-[18px] rounded-full bg-indigo-500/60
          animate-pulse-dot
        " />
      </div>

      <p className="text-slate-500 font-body text-sm tracking-wide">{message}</p>
    </div>
  );
}
