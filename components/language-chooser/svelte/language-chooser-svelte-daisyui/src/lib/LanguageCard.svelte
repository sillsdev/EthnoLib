<script lang="ts">
  import type { LanguageCardViewModel } from "@ethnolib/language-chooser-controller";
  import type { SvelteViewModel } from "@ethnolib/state-management-svelte";

  const {
    viewModel,
    onSelect,
  }: {
    viewModel: SvelteViewModel<LanguageCardViewModel>;
    onSelect?: (element: HTMLElement) => void;
  } = $props();

  let cardElement: HTMLElement;

  function handleClick() {
    const wasSelected = viewModel.isSelected;
    viewModel.isSelected = !viewModel.isSelected;

    if (!wasSelected && viewModel.isSelected && onSelect) {
      onSelect(cardElement);
    }
  }
</script>

<div
  bind:this={cardElement}
  class="card card-border shadow-md my-2"
  class:text-primary-content={viewModel.isSelected}
  class:bg-primary={viewModel.isSelected}
  class:bg-base-100={!viewModel.isSelected}
  class:hover:bg-base-300={!viewModel.isSelected}
>
  <button class="card-body text-left" onclick={handleClick}>
    <div class="flex">
      <div class="text-lg flex-1">{viewModel.title}</div>
      <div class="flex-none mr-4">{viewModel.secondTitle}</div>
      <div class="flex-none font-mono opacity-70">
        {viewModel.language.iso639_3_code}
      </div>
    </div>
    <div>
      {#if viewModel.description()}
        <p class="mt-2 text-sm opacity-80">{viewModel.description()}</p>
      {/if}
      <p class="mt-2 text-sm opacity-80">
        {viewModel.language.names.join(", ")}
      </p>
    </div>
  </button>
</div>
