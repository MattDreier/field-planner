<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Bed, PlacedPlant } from '$lib/types';

	interface LayoutSummary {
		_id: string;
		name: string;
		createdAt: number;
	}

	interface Props {
		isConvexAvailable: boolean;
		beds: Bed[];
		plants: PlacedPlant[];
		onSave?: (name: string) => Promise<void>;
		onLoad?: (layoutId: string) => Promise<void>;
		onDelete?: (layoutId: string) => Promise<void>;
		layouts?: LayoutSummary[];
		currentLayoutId?: string;
	}

	let {
		isConvexAvailable,
		beds,
		plants,
		onSave,
		onLoad,
		onDelete,
		layouts = [],
		currentLayoutId
	}: Props = $props();

	let layoutName = $state('');
	let isSaving = $state(false);
	let isLoading = $state(false);
	let isDeleting = $state(false);
	let selectedLayoutId = $state('');
	let showSaveInput = $state(false);

	async function handleSave() {
		if (!onSave || !layoutName.trim()) return;

		isSaving = true;
		try {
			await onSave(layoutName.trim());
			layoutName = '';
			showSaveInput = false;
		} finally {
			isSaving = false;
		}
	}

	async function handleLoad() {
		if (!onLoad || !selectedLayoutId) return;

		isLoading = true;
		try {
			await onLoad(selectedLayoutId);
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete() {
		if (!onDelete || !currentLayoutId) return;

		isDeleting = true;
		try {
			await onDelete(currentLayoutId);
		} finally {
			isDeleting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSave();
		} else if (event.key === 'Escape') {
			showSaveInput = false;
			layoutName = '';
		}
	}

	const currentLayoutName = $derived(
		layouts.find((l) => l._id === currentLayoutId)?.name
	);
</script>

<div class="flex items-center gap-2">
	{#if !isConvexAvailable}
		<span
			class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium"
			title="Data is stored in memory only and will be lost on refresh"
		>
			Demo Mode
		</span>
	{:else}
		<!-- Current layout indicator -->
		{#if currentLayoutName}
			<span class="text-sm text-muted-foreground">
				Layout: <span class="font-medium text-foreground">{currentLayoutName}</span>
			</span>
		{/if}

		<!-- Save controls -->
		{#if showSaveInput}
			<div class="flex items-center gap-1">
				<input
					type="text"
					bind:value={layoutName}
					onkeydown={handleKeydown}
					placeholder="Layout name"
					class="h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
					disabled={isSaving}
				/>
				<Button size="sm" onclick={handleSave} disabled={isSaving || !layoutName.trim()}>
					{isSaving ? 'Saving...' : 'Save'}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onclick={() => {
						showSaveInput = false;
						layoutName = '';
					}}
				>
					Cancel
				</Button>
			</div>
		{:else}
			<Button size="sm" variant="outline" onclick={() => (showSaveInput = true)}>
				Save Layout
			</Button>
		{/if}

		<!-- Load controls -->
		{#if layouts.length > 0}
			<div class="flex items-center gap-1">
				<select
					bind:value={selectedLayoutId}
					class="h-8 px-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
					disabled={isLoading}
				>
					<option value="">Select layout...</option>
					{#each layouts as layout}
						<option value={layout._id}>{layout.name}</option>
					{/each}
				</select>
				<Button
					size="sm"
					variant="secondary"
					onclick={handleLoad}
					disabled={isLoading || !selectedLayoutId}
				>
					{isLoading ? 'Loading...' : 'Load'}
				</Button>
			</div>
		{/if}

		<!-- Delete current layout -->
		{#if currentLayoutId}
			<Button
				size="sm"
				variant="destructive"
				onclick={handleDelete}
				disabled={isDeleting}
			>
				{isDeleting ? 'Deleting...' : 'Delete'}
			</Button>
		{/if}
	{/if}
</div>
