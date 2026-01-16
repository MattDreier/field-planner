<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-svelte';

	interface Props {
		zoom: number;
		onZoomIn: () => void;
		onZoomOut: () => void;
		onReset: () => void;
	}

	let { zoom, onZoomIn, onZoomOut, onReset }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<Button variant="outline" size="icon" onclick={onZoomOut} title="Zoom Out">
		<ZoomOut class="w-4 h-4" />
	</Button>

	<span class="text-sm text-muted-foreground min-w-[4rem] text-center">
		{Math.round(zoom * 100)}%
	</span>

	<Button variant="outline" size="icon" onclick={onZoomIn} title="Zoom In">
		<ZoomIn class="w-4 h-4" />
	</Button>

	<Button variant="outline" size="icon" onclick={onReset} title="Reset View">
		<Maximize2 class="w-4 h-4" />
	</Button>
</div>
