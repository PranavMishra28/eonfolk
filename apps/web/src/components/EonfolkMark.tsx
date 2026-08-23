interface EonfolkMarkProps {
	readonly className?: string;
	readonly label?: string;
}

export function EonfolkMark({ className, label }: EonfolkMarkProps) {
	const classes = ["eonfolk-mark", className].filter(Boolean).join(" ");
	return (
		<img
			className={classes}
			src="/eonfolk-mark.svg"
			alt={label ?? ""}
			aria-hidden={label === undefined ? true : undefined}
			draggable={false}
		/>
	);
}
