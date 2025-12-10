import { createStore, createTypedHooks } from 'easy-peasy';
import { ArtModel, artModel } from './models/artModel';

export interface StoreModel {
  art: ArtModel;
}

export const store = createStore<StoreModel>({
  art: artModel,
});

const typedHooks = createTypedHooks<StoreModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreDispatch;
export const useStoreState = typedHooks.useStoreState;
