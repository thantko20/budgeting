import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
	children,
	tone = "neutral",
	className,
}: {
	children: ReactNode;
	tone?: "neutral" | "income" | "expense" | "transfer";
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
				tone === "neutral" && "bg-muted text-foreground",
				tone === "income" &&
					"bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
				tone === "expense" && "bg-rose-500/15 text-rose-800 dark:text-rose-300",
				tone === "transfer" && "bg-sky-500/15 text-sky-800 dark:text-sky-300",
				className,
			)}
		>
			{children}
		</span>
	);
}
