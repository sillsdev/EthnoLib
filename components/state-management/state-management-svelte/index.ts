import { SvelteFieldImpl } from "./src/field.svelte";
import {
  type SvelteViewModel,
  transformViewModel,
} from "./src/transform-view-model";

function svelteViewModel<T extends object>(viewModel: T) {
  return transformViewModel(viewModel, SvelteFieldImpl);
}

export { svelteViewModel, type SvelteViewModel };
