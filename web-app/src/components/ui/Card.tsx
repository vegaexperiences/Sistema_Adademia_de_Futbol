import { cn } from "@/lib/utils"; // Need to create utils

export function Card({ className, children }: { className?: string, children: React.ReactNode }) {
  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-gray-100", className)}>
      {children}
    </div>
  );
}
