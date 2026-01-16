<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ChevronDown, Save, FilePlus, Trash2, FolderOpen, Check, LogIn } from 'lucide-svelte';
	import type { Bed, PlacedPlant } from '$lib/types';

	interface LayoutSummary {
		_id: string;
		name: string;
		createdAt: number;
	}

	interface Props {
		isConvexAvailable: boolean;
		isSignedIn: boolean;
		beds: Bed[];
		plants: PlacedPlant[];
		onSave?: (name: string) => Promise<void>;
		onLoad?: (layoutId: string) => Promise<void>;
		onDelete?: (layoutId: string) => Promise<void>;
		onNew?: () => void;
		onSignIn?: () => void;
		layouts?: LayoutSummary[];
		currentLayoutId?: string;
		hasUnsavedChanges?: boolean;
	}

	let {
		isConvexAvailable,
		isSignedIn,
		beds,
		plants,
		onSave,
		onLoad,
		onDelete,
		onNew,
		onSignIn,
		layouts = [],
		currentLayoutId,
		hasUnsavedChanges = false
	}: Props = $props();

	let isSaving = $state(false);
	let isLoading = $state(false);
	let isDeleting = $state(false);
	let showSaveAsDialog = $state(false);
	let showDeleteDialog = $state(false);
	let newLayoutName = $state('');
	let dropdownOpen = $state(false);

	const currentLayout = $derived(layouts.find((l) => l._id === currentLayoutId));
	const currentLayoutName = $derived(currentLayout?.name ?? 'Untitled');
	const hasContent = $derived(beds.length > 0 || plants.length > 0);

	async function handleSave() {
		if (!onSave || !currentLayoutId) return;

		isSaving = true;
		try {
			await onSave(currentLayoutName);
		} finally {
			isSaving = false;
		}
	}

	async function handleSaveAs() {
		if (!onSave || !newLayoutName.trim()) return;

		isSaving = true;
		try {
			await onSave(newLayoutName.trim());
			newLayoutName = '';
			showSaveAsDialog = false;
		} finally {
			isSaving = false;
		}
	}

	async function handleLoad(layoutId: string) {
		if (!onLoad) return;

		isLoading = true;
		dropdownOpen = false;
		try {
			await onLoad(layoutId);
		} finally {
			isLoading = false;
		}
	}

	async function handleDelete() {
		if (!onDelete || !currentLayoutId) return;

		isDeleting = true;
		try {
			await onDelete(currentLayoutId);
			showDeleteDialog = false;
		} finally {
			isDeleting = false;
		}
	}

	function handleNew() {
		dropdownOpen = false;
		onNew?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSaveAs();
		} else if (event.key === 'Escape') {
			showSaveAsDialog = false;
			newLayoutName = '';
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

{#if !isConvexAvailable}
	<span
		class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-medium"
		title="Data is stored in memory only and will be lost on refresh"
	>
		Demo Mode
	</span>
{:else}
	<DropdownMenu.Root bind:open={dropdownOpen}>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button variant="outline" size="sm" {...props} class="gap-2">
					<FolderOpen class="h-4 w-4" />
					<span class="max-w-32 truncate">{currentLayoutName}</span>
					{#if hasUnsavedChanges}
						<span class="h-2 w-2 rounded-full bg-orange-500" title="Unsaved changes"></span>
					{/if}
					<ChevronDown class="h-4 w-4 opacity-50" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>

		<DropdownMenu.Portal>
			<DropdownMenu.Content class="w-56" align="end">
				{#if !isSignedIn}
					<!-- Not signed in - show sign in prompt -->
					<DropdownMenu.Item onclick={() => { dropdownOpen = false; onSignIn?.(); }}>
						<LogIn class="mr-2 h-4 w-4" />
						<span>Sign in to save layouts</span>
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={handleNew}>
						<FilePlus class="mr-2 h-4 w-4" />
						<span>New layout</span>
					</DropdownMenu.Item>
				{:else}
					<!-- Signed in - show full menu -->
					<!-- Save actions -->
					{#if currentLayoutId}
						<DropdownMenu.Item onclick={handleSave} disabled={isSaving || !hasContent}>
							<Save class="mr-2 h-4 w-4" />
							<span>Save</span>
							<DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
						</DropdownMenu.Item>
					{/if}

					<DropdownMenu.Item onclick={() => { dropdownOpen = false; showSaveAsDialog = true; }} disabled={!hasContent}>
						<FilePlus class="mr-2 h-4 w-4" />
						<span>{currentLayoutId ? 'Save as new...' : 'Save layout...'}</span>
					</DropdownMenu.Item>

					<DropdownMenu.Separator />

					<!-- Saved layouts -->
					{#if layouts.length > 0}
						<DropdownMenu.Label>Your Layouts</DropdownMenu.Label>
						<DropdownMenu.Group>
							{#each layouts as layout}
								<DropdownMenu.Item
									onclick={() => handleLoad(layout._id)}
									disabled={isLoading}
									class="justify-between"
								>
									<span class="truncate">{layout.name}</span>
									<span class="flex items-center gap-2">
										{#if layout._id === currentLayoutId}
											<Check class="h-4 w-4 text-primary" />
										{:else}
											<span class="text-xs text-muted-foreground">{formatDate(layout.createdAt)}</span>
										{/if}
									</span>
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
					{/if}

					<!-- New layout -->
					<DropdownMenu.Item onclick={handleNew}>
						<FilePlus class="mr-2 h-4 w-4" />
						<span>New layout</span>
					</DropdownMenu.Item>

					<!-- Delete -->
					{#if currentLayoutId}
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							onclick={() => { dropdownOpen = false; showDeleteDialog = true; }}
							class="text-destructive focus:text-destructive"
						>
							<Trash2 class="mr-2 h-4 w-4" />
							<span>Delete layout</span>
						</DropdownMenu.Item>
					{/if}
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>

	<!-- Save As Dialog -->
	<Dialog.Root bind:open={showSaveAsDialog}>
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>Save Layout</Dialog.Title>
					<Dialog.Description>
						Give your layout a name to save it to your account.
					</Dialog.Description>
				</Dialog.Header>
				<div class="py-4">
					<input
						type="text"
						bind:value={newLayoutName}
						onkeydown={handleKeydown}
						placeholder="My Garden Layout"
						class="w-full h-10 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
						disabled={isSaving}
					/>
				</div>
				<Dialog.Footer>
					<Button variant="outline" onclick={() => { showSaveAsDialog = false; newLayoutName = ''; }}>
						Cancel
					</Button>
					<Button onclick={handleSaveAs} disabled={isSaving || !newLayoutName.trim()}>
						{isSaving ? 'Saving...' : 'Save Layout'}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<!-- Delete Confirmation Dialog -->
	<AlertDialog.Root bind:open={showDeleteDialog}>
		<AlertDialog.Portal>
			<AlertDialog.Overlay />
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete "{currentLayoutName}"?</AlertDialog.Title>
					<AlertDialog.Description>
						This will permanently delete this layout and all its beds and plants. This action cannot be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<AlertDialog.Action onclick={handleDelete} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
						{isDeleting ? 'Deleting...' : 'Delete'}
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Portal>
	</AlertDialog.Root>
{/if}
