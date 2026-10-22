import {
	formatMonthLabel,
	isCurrencyCode,
	minorUnitExponent,
} from "@budgeting/ledger";
import { type ReactNode, useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { formatAmount } from "@/lib/format-amount";

const FILLS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function SpendingChart({
	currency,
	categories,
}: {
	currency: string;
	categories: Array<{ name: string; totalMinor: number }>;
}) {
	const slices = categories.filter((category) => category.totalMinor > 0);
	if (slices.length === 0) {
		return <EmptyChart>No spending this month.</EmptyChart>;
	}

	return (
		<ChartFrame
			summary={slices
				.map(
					(slice) =>
						`${slice.name} ${formatAmount(slice.totalMinor, currency)}`,
				)
				.join(", ")}
		>
			<div className="h-52">
				<ClientChart>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={slices}
								dataKey="totalMinor"
								nameKey="name"
								innerRadius={58}
								outerRadius={84}
								paddingAngle={2}
								stroke="transparent"
							>
								{slices.map((slice, index) => (
									<Cell key={slice.name} fill={FILLS[index % FILLS.length]} />
								))}
							</Pie>
							<Tooltip content={<MoneyTooltip currency={currency} />} />
						</PieChart>
					</ResponsiveContainer>
				</ClientChart>
			</div>
			<ul className="grid gap-1 text-sm">
				{slices.map((slice, index) => (
					<li
						key={slice.name}
						className="flex items-center justify-between gap-3"
					>
						<span className="flex items-center gap-2">
							<span
								className="size-2.5 rounded-full"
								style={{ background: FILLS[index % FILLS.length] }}
							/>
							{slice.name}
						</span>
						<span className="tabular-nums">
							{formatAmount(slice.totalMinor, currency)}
						</span>
					</li>
				))}
			</ul>
		</ChartFrame>
	);
}

export function TrendChart({
	currency,
	points,
}: {
	currency: string;
	points: Array<{
		month: string;
		label: string;
		incomeMinor: number;
		expenseMinor: number;
	}>;
}) {
	const data = points.map((point) => ({
		...point,
		Income: point.incomeMinor,
		Expenses: point.expenseMinor,
	}));
	const summary = points
		.map(
			(point) =>
				`${formatMonthLabel(point.month)}: income ${formatAmount(point.incomeMinor, currency)}, expenses ${formatAmount(point.expenseMinor, currency)}`,
		)
		.join(". ");

	return (
		<ChartFrame summary={summary}>
			<div className="h-64">
				<ClientChart>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} barGap={2}>
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								width={48}
								tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
								tickFormatter={(value) => compactMinor(Number(value), currency)}
							/>
							<Tooltip content={<MoneyTooltip currency={currency} />} />
							<Bar
								dataKey="Income"
								fill="var(--chart-2)"
								radius={[4, 4, 0, 0]}
							/>
							<Bar
								dataKey="Expenses"
								fill="var(--chart-5)"
								radius={[4, 4, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</ClientChart>
			</div>
			<p className="flex gap-4 text-muted-foreground text-xs">
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-[var(--chart-2)]" /> Income
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-full bg-[var(--chart-5)]" /> Expenses
				</span>
			</p>
		</ChartFrame>
	);
}

function ChartFrame({
	summary,
	children,
}: {
	summary: string;
	children: ReactNode;
}) {
	return (
		<div className="grid gap-3">
			<p className="sr-only">{summary}</p>
			<div aria-hidden="true" className="grid gap-3">
				{children}
			</div>
		</div>
	);
}

function ClientChart({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		setReady(true);
	}, []);
	if (!ready) {
		return <div className="h-full rounded-lg bg-muted/40" />;
	}
	return children;
}

function EmptyChart({ children }: { children: string }) {
	return (
		<p className="grid h-48 place-items-center text-muted-foreground text-sm">
			{children}
		</p>
	);
}

function MoneyTooltip({
	active,
	payload,
	label,
	currency,
}: {
	active?: boolean;
	payload?: Array<{
		name?: string;
		value?: number;
		payload?: { name?: string };
	}>;
	label?: string;
	currency: string;
}) {
	if (!active || !payload?.length) {
		return null;
	}
	return (
		<div className="rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-sm shadow-md">
			<p className="font-medium">{label ?? payload[0]?.payload?.name}</p>
			<ul className="mt-1 grid gap-0.5">
				{payload.map((entry) => (
					<li key={entry.name} className="tabular-nums">
						{entry.name}: {formatAmount(Number(entry.value ?? 0), currency)}
					</li>
				))}
			</ul>
		</div>
	);
}

function compactMinor(amountMinor: number, currency: string): string {
	const exponent = isCurrencyCode(currency) ? minorUnitExponent(currency) : 0;
	const major = amountMinor / 10 ** exponent;
	return new Intl.NumberFormat("en", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(major);
}
