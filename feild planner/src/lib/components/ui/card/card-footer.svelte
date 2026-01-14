<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	type $$Props = HTMLAttributes<HTMLDivElement>;

	let { class: className, ...restProps }: $$Props = $props();
</script>

<div class={cn('flex items-center p-6 pt-0', className)} {...restProps}>
	<slot />
</div>
