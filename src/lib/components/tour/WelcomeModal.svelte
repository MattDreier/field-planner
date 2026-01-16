<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { tourState, startTour, skipTour } from '$lib/stores/tour.svelte';
	import { Flower2, Move, Calendar, Sun } from 'lucide-svelte';
</script>

<Dialog.Root bind:open={tourState.showWelcome}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title class="text-2xl">Welcome to Field Planner!</Dialog.Title>
				<Dialog.Description class="text-base">
					Plan your cut flower garden with visual beds, plant spacing, and timeline tracking.
				</Dialog.Description>
			</Dialog.Header>

			<div class="py-6 space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
						<div class="p-2 rounded-full bg-primary/10 text-primary">
							<Move class="h-5 w-5" />
						</div>
						<div>
							<h4 class="font-medium text-sm">Draw Beds</h4>
							<p class="text-xs text-muted-foreground">Create rectangular or circular garden beds</p>
						</div>
					</div>

					<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
						<div class="p-2 rounded-full bg-primary/10 text-primary">
							<Flower2 class="h-5 w-5" />
						</div>
						<div>
							<h4 class="font-medium text-sm">Place Plants</h4>
							<p class="text-xs text-muted-foreground">Drag flowers with smart spacing circles</p>
						</div>
					</div>

					<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
						<div class="p-2 rounded-full bg-primary/10 text-primary">
							<Calendar class="h-5 w-5" />
						</div>
						<div>
							<h4 class="font-medium text-sm">Timeline View</h4>
							<p class="text-xs text-muted-foreground">See planting and harvest schedules</p>
						</div>
					</div>

					<div class="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
						<div class="p-2 rounded-full bg-primary/10 text-primary">
							<Sun class="h-5 w-5" />
						</div>
						<div>
							<h4 class="font-medium text-sm">Shadow Simulation</h4>
							<p class="text-xs text-muted-foreground">Visualize sunlight throughout the day</p>
						</div>
					</div>
				</div>
			</div>

			<Dialog.Footer class="flex-col sm:flex-row gap-2">
				<Button variant="ghost" onclick={skipTour} class="sm:mr-auto">
					Skip for now
				</Button>
				<Button onclick={startTour} class="gap-2">
					Start Tour
					<span class="text-xs opacity-75">(~2 min)</span>
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
