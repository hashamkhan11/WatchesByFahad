import { useEffect } from "react";
import { Check } from "lucide-react";

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5">
      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />{msg}
    </div>
  );
}
