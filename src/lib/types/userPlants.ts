import type { PlantData } from '$lib/data/plants';

export type UserPlantData = PlantData & {
	isUserPlant: true;
	createdAt: number;
	updatedAt: number;
};

export interface UserPlantStore {
	version: 1;
	plants: UserPlantData[];
}
