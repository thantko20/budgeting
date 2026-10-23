import { currentMonth, DEFAULT_TIME_ZONE } from "@budgeting/ledger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRouter as createTanStackRouter,
	type ErrorComponentProps,
	Link,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});

	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		context: { queryClient },
		defaultErrorComponent: RouteError,
		defaultNotFoundComponent: NotFound,
		Wrap: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
	return router;
}

function RouteError({ error }: ErrorComponentProps) {
	return (
		<main className="mx-auto max-w-3xl px-4 py-10">
			<h1 className="font-semibold text-2xl">Something went wrong</h1>
			<p className="mt-2 text-muted-foreground">
				{error instanceof Error
					? error.message
					: "The page could not be loaded."}
			</p>
		</main>
	);
}

function NotFound() {
	return (
		<main className="mx-auto max-w-3xl px-4 py-10">
			<h1 className="font-semibold text-2xl">Page not found</h1>
			<p className="mt-2 text-muted-foreground">
				That page is not part of this budget.
			</p>
			<p className="mt-4">
				<Link
					to="/"
					search={{ month: currentMonth(DEFAULT_TIME_ZONE) }}
					className="underline"
				>
					Back to overview
				</Link>
			</p>
		</main>
	);
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
