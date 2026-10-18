import { currentMonth, DEFAULT_TIME_ZONE } from "@budgeting/ledger";
import { Link, useRouterState } from "@tanstack/react-router";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
	const isPending = useRouterState({
		select: (state) => state.status === "pending",
	});

	return (
		<header className="border-b">
			<div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
				<nav aria-label="Primary">
					<Link
						to="/"
						search={{ month: currentMonth(DEFAULT_TIME_ZONE) }}
						className="font-semibold text-lg"
					>
						Budget
					</Link>
				</nav>
				<div className="flex items-center gap-3">
					{isPending ? (
						<p role="status" className="text-muted-foreground text-sm">
							Loading
						</p>
					) : null}
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
