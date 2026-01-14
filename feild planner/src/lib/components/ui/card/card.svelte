<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	type $$Props = HTMLAttributes<HTMLDivElement>;

	let { class: className, ...restProps }: $$Props = $props();
</script>

<div
	class={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
	{...restProps}
>
	<slot />
</div>
