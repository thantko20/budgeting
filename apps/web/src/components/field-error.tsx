export function FieldError({
	id,
	errors,
}: {
	id: string;
	errors: ReadonlyArray<unknown>;
}) {
	const message = messageFrom(errors);
	if (!message) {
		return null;
	}
	return (
		<p id={id} role="alert" className="text-destructive text-sm">
			{message}
		</p>
	);
}

export function messageFrom(
	errors: ReadonlyArray<unknown>,
): string | undefined {
	const first = errors[0];
	if (typeof first === "string") {
		return first;
	}
	if (first && typeof first === "object" && "message" in first) {
		const message = first.message;
		if (typeof message === "string") {
			return message;
		}
	}
	return undefined;
}
