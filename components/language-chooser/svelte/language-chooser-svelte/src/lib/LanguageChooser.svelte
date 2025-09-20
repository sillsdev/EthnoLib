<script lang="ts">
  import {
    createTagFromOrthography,
    type IOrthography,
  } from "@ethnolib/find-language";
  import LanguageCard from "./LanguageCard.svelte";
  import ScriptCard from "./ScriptCard.svelte";
  import SearchIcon from "./SearchIcon.svelte";
  import { LanguageChooserViewModel } from "@ethnolib/language-chooser-controller";
  import { useViewModel } from "@ethnolib/state-management-svelte";

  const {
    onDismiss,
    onOk,
  }: {
    onDismiss: () => void;
    onOk: (orthography: IOrthography, languageTag?: string) => void;
  } = $props();

  const viewModel = useViewModel(new LanguageChooserViewModel());

  let orthography: IOrthography = $derived({
    language: viewModel.selectedLanguage,
    script: viewModel.selectedScript,
    customDetails: viewModel.customizations,
  });

  let languageTag = $derived(createTagFromOrthography(orthography));
</script>

<div class="h-full flex flex-col">
  <h3 class="text-3xl p-4 border-b-2 border-base-300 flex-none">
    Choose Language
  </h3>

  <div class="flex flex-1 min-h-0">
    <div class="flex-1 flex flex-col min-h-0 bg-base-200 p-4">
      <div class="flex-none pb-1">
        <label class="input w-full">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search by name, code, or country"
            bind:value={viewModel.searchString}
          />
        </label>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0">
        {#each viewModel.listedLanguages
          .slice(0, 100)
          .map(useViewModel) as lang}
          <LanguageCard viewModel={lang} />
          {#if lang.isSelected && viewModel.listedScripts.length > 0}
            <div class="ml-8 mb-4">
              <div class="py-2">
                <p class="font-semibold text-sm">Select a script:</p>
              </div>
              <div class="grid grid-cols-3 gap-4">
                {#each viewModel.listedScripts.map(useViewModel) as script}
                  <ScriptCard viewModel={script} />
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <div class="flex-none py-2">
        <div
          class="card card-xs card-border border-base-300 bg-base-100 hover:bg-base-300 shadow-xl w-48 pl-2"
        >
          <button class="card-body text-left" onclick={() => console.log("hi")}>
            <p class="card-title uppercase">Customize</p>
            <div class="flex">
              <p class="flex-1 font-mono text-sm opacity-60">
                {viewModel.tagPreview}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col p-6">
      <div class="flex-1"></div>
      <div class="flex-none">
        {#if viewModel.selectedLanguage}
          <label>
            <span class="font-semibold opacity-70"
              >Display this language this way</span
            >
            <input
              class="input input-xl w-full"
              bind:value={viewModel.displayName}
            />
          </label>
          <div class="font-mono opacity-70 p-2">
            <p>{viewModel.tagPreview}</p>
          </div>
        {/if}
        <div class="flex justify-end">
          <button
            class="btn btn-primary uppercase w-24 mx-1"
            disabled={!viewModel.isReadyToSubmit}
            onclick={() => onOk(orthography, languageTag)}>Ok</button
          >
          <button class="btn uppercase w-24 mx-1" onclick={onDismiss}
            >Cancel</button
          >
        </div>
      </div>
    </div>
  </div>
</div>
