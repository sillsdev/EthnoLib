<script lang="ts">
  import { LanguageCardViewModel } from "@ethnolib/language-chooser-controller";
  import { useViewModel } from "@ethnolib/state-management-svelte";

  const props: { viewModel: LanguageCardViewModel } = $props();

  const viewModel = useViewModel(props.viewModel);

  const body = [
    "A language of Antigua and Barbuda",
    "Anguillan Creole English, Something else, lots and lots and lots of other names, and even more names",
  ];
</script>

<div
  class="card card-border shadow-md my-2"
  class:text-primary-content={viewModel.isSelected}
  class:bg-primary={viewModel.isSelected}
  class:bg-base-100={!viewModel.isSelected}
  class:hover:bg-base-300={!viewModel.isSelected}
>
  <button
    class="card-body text-left"
    onclick={() => (viewModel.isSelected = !viewModel.isSelected)}
  >
    <div class="flex">
      <div class="text-lg flex-1">{viewModel.language.autonym}</div>
      <div class="flex-none mr-4">{viewModel.language.exonym}</div>
      <div class="flex-none font-mono opacity-70">
        {viewModel.language.iso639_3_code}
      </div>
    </div>
    <div>
      {#each body ?? [] as bodyText}
        <p class="mt-2 text-sm opacity-80">{bodyText}</p>
      {/each}
    </div>
  </button>
</div>
