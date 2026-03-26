<script lang="ts">
	import { plantDragState } from '$lib/stores/plantDrag.svelte';
</script>

{#if plantDragState.isDragging && plantDragState.plant}
	<div
		class="fixed z-50 pointer-events-none px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg opacity-90"
		style="left: {plantDragState.pointerX}px; top: {plantDragState.pointerY}px; transform: translate(-50%, -100%) translateY(-8px);"
	>
		{plantDragState.plant.flowerName}
	</div>
{/if}
