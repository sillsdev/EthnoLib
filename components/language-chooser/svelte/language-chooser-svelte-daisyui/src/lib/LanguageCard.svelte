<script lang="ts">
  import type { LanguageCardViewModel } from "@ethnolib/language-chooser-controller";
  import type { SvelteViewModel } from "@ethnolib/state-management-svelte";
  import TextWithMatches from "./TextWithMatches.svelte";

  const {
    viewModel,
    onSelect,
    searchText,
  }: {
    viewModel: SvelteViewModel<LanguageCardViewModel>;
    onSelect?: (element: HTMLElement) => void;
    searchText: string;
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
      <div class="text-lg flex-1">
        <TextWithMatches
          text={viewModel.title}
          matchWith={searchText}
          highlight={!viewModel.isSelected}
        />
      </div>
      <div class="flex-none mr-4">
        <TextWithMatches
          text={viewModel.secondTitle}
          matchWith={searchText}
          highlight={!viewModel.isSelected}
        />
      </div>
      <div class="flex-none font-mono opacity-70">
        <TextWithMatches
          text={viewModel.language.iso639_3_code}
          matchWith={searchText}
          highlight={!viewModel.isSelected}
        />
      </div>
    </div>
    <div>
      {#if viewModel.description()}
        <p class="mt-2 text-sm opacity-80">
          <TextWithMatches
            text={viewModel.description()}
            matchWith={searchText}
            highlight={!viewModel.isSelected}
            truncate
          />
        </p>
      {/if}
      <p class="mt-2 text-sm opacity-80">
        <TextWithMatches
          text={viewModel.language.names.join(", ")}
          matchWith={searchText}
          highlight={!viewModel.isSelected}
          truncate
        />
      </p>
    </div>
  </button>
</div>
