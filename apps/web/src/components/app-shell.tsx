import {
	currentMonth,
	DEFAULT_TIME_ZONE,
	formatMonthLabel,
	isValidMonth,
	shiftMonth,
} from "@budgeting/ledger";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	LayoutDashboardIcon,
	MenuIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	ReceiptIcon,
	TagsIcon,
	WalletIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AddMenu } from "@/components/add-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { accountsQuery } from "@/lib/accounts-query";
import { monthQuery } from "@/lib/month-query";
import { cn } from "@/lib/utils";

const NAV = [
	{ to: "/", label: "Overview", icon: LayoutDashboardIcon },
	{ to: "/transactions", label: "Transactions", icon: ReceiptIcon },
	{ to: "/accounts", label: "Accounts", icon: WalletIcon },
	{ to: "/categories", label: "Categories", icon: TagsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const searchStr = useRouterState({
		select: (state) => state.location.searchStr,
	});
	const month = monthFromSearch(searchStr);
	const [collapsed, setCollapsed] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const monthData = useQuery(monthQuery(month));
	const accountData = useQuery(accountsQuery());

	useEffect(() => {
		if (pathname.length > 0) {
			setMobileOpen(false);
		}
	}, [pathname]);

	return (
		<div className="flex min-h-svh bg-background">
			<a
				href="#content"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2"
			>
				Skip to content
			</a>
			<aside
				className={cn(
					"sticky top-0 hidden h-svh shrink-0 flex-col border-sidebar-border border-r bg-sidebar text-sidebar-foreground md:flex",
					collapsed ? "w-16" : "w-60",
				)}
			>
				<Brand collapsed={collapsed} />
				<SideNav month={month} pathname={pathname} collapsed={collapsed} />
			</aside>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-5">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="md:hidden"
						aria-label="Open menu"
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen(true)}
					>
						<MenuIcon />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="hidden md:inline-flex"
						aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
						onClick={() => setCollapsed((value) => !value)}
					>
						{collapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
					</Button>
					<MonthSwitcher month={month} />
					<div className="ml-auto flex items-center gap-2">
						<ThemeToggle />
						<AddMenu
							month={month}
							accounts={
								monthData.data?.accounts ?? accountData.data?.accounts ?? []
							}
							categories={monthData.data?.categories ?? []}
						/>
					</div>
				</header>
				<div id="content" className="flex-1">
					{children}
				</div>
			</div>
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetContent aria-describedby={undefined}>
					<SheetTitle className="sr-only">Menu</SheetTitle>
					<Brand collapsed={false} />
					<SideNav month={month} pathname={pathname} collapsed={false} />
				</SheetContent>
			</Sheet>
		</div>
	);
}

function Brand({ collapsed }: { collapsed: boolean }) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 px-3 py-4",
				collapsed && "justify-center",
			)}
		>
			<span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground text-sm">
				K
			</span>
			{collapsed ? null : (
				<span className="font-semibold tracking-tight">Budget</span>
			)}
		</div>
	);
}

function SideNav({
	month,
	pathname,
	collapsed,
}: {
	month: string;
	pathname: string;
	collapsed: boolean;
}) {
	return (
		<nav aria-label="Primary" className="grid gap-1 px-2">
			{NAV.map((item) => {
				const active = pathname === item.to;
				const Icon = item.icon;
				return (
					<Link
						key={item.to}
						to={item.to}
						search={{ month }}
						aria-current={active ? "page" : undefined}
						title={collapsed ? item.label : undefined}
						className={cn(
							"flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
							active &&
								"bg-sidebar-accent font-medium text-sidebar-accent-foreground",
							collapsed && "justify-center",
						)}
					>
						<Icon className="size-4 shrink-0" aria-hidden="true" />
						{collapsed ? (
							<span className="sr-only">{item.label}</span>
						) : (
							item.label
						)}
					</Link>
				);
			})}
		</nav>
	);
}

function MonthSwitcher({ month }: { month: string }) {
	const previous = shiftMonth(month, -1);
	const next = shiftMonth(month, 1);
	return (
		<div className="flex items-center gap-1">
			<MonthLink month={previous} label="Previous month">
				<ChevronLeftIcon />
			</MonthLink>
			<p className="min-w-28 text-center font-medium text-sm sm:min-w-36">
				{formatMonthLabel(month)}
			</p>
			<MonthLink month={next} label="Next month">
				<ChevronRightIcon />
			</MonthLink>
		</div>
	);
}

function MonthLink({
	month,
	label,
	children,
}: {
	month: string;
	label: string;
	children: ReactNode;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const className =
		"inline-flex size-8 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
	if (pathname === "/transactions") {
		return (
			<Link
				to="/transactions"
				search={(previous) => ({
					month,
					account: previous.account,
					category: previous.category,
					type: previous.type ?? "all",
				})}
				aria-label={label}
				className={className}
			>
				{children}
			</Link>
		);
	}
	if (pathname === "/accounts") {
		return (
			<Link
				to="/accounts"
				search={{ month }}
				aria-label={label}
				className={className}
			>
				{children}
			</Link>
		);
	}
	if (pathname === "/categories") {
		return (
			<Link
				to="/categories"
				search={{ month }}
				aria-label={label}
				className={className}
			>
				{children}
			</Link>
		);
	}
	return (
		<Link to="/" search={{ month }} aria-label={label} className={className}>
			{children}
		</Link>
	);
}

function monthFromSearch(searchStr: string): string {
	const month = new URLSearchParams(searchStr).get("month");
	if (month && isValidMonth(month)) {
		return month;
	}
	return currentMonth(DEFAULT_TIME_ZONE);
}
