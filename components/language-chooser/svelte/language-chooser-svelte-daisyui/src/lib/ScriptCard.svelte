<script lang="ts">
  import type { SvelteViewModel } from "@ethnolib/state-management-svelte";
  import type { ScriptCardViewModel } from "@ethnolib/language-chooser-controller";
  import { scriptSamples } from "@ethnolib/find-language";

  const { viewModel }: { viewModel: SvelteViewModel<ScriptCardViewModel> } =
    $props();
</script>

<div
  class="card card-xs shadow-md"
  class:text-secondary-content={viewModel.isSelected}
  class:bg-secondary={viewModel.isSelected}
  class:bg-base-100={!viewModel.isSelected}
  class:hover:bg-base-300={!viewModel.isSelected}
>
  <button
    class="card-body text-left"
    onclick={() => (viewModel.isSelected = !viewModel.isSelected)}
  >
    <p class="card-title">{viewModel.script.name}</p>
    <p>{scriptSamples[viewModel.script.code.toLowerCase()] || ""}</p>
  </button>
</div>
