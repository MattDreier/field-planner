<script lang="ts">
	import { Button as ButtonPrimitive } from 'bits-ui';
	import { type Props, buttonVariants } from './index.js';
	import { cn } from '$lib/utils.js';

	type $$Props = Props;

	let {
		class: className,
		variant = 'default',
		size = 'default',
		...restProps
	}: $$Props = $props();
</script>

<ButtonPrimitive.Root
	class={cn(buttonVariants({ variant, size, className }))}
	{...restProps}
>
	<slot />
</ButtonPrimitive.Root>
