import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted && resolvedTheme === "dark";
	const label = isDark ? "Switch to light theme" : "Switch to dark theme";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-sm"
			aria-label={label}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? "Light" : "Dark"}
		</button>
	);
}
