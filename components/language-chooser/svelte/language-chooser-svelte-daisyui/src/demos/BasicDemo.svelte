<script lang="ts">
  import {
    createTagFromOrthography,
    defaultDisplayName,
    type IOrthography,
  } from "@ethnolib/find-language";
  import LanguageChooser from "../lib/LanguageChooser.svelte";

  let theme = $state("light");
  let orthography: IOrthography = $state({});
  let languageTag: string | undefined = $state();

  function onDismiss() {
    return;
  }

  function onOk(nextOrthography: IOrthography, nextLanguageTag?: string) {
    orthography = nextOrthography;
    languageTag = nextLanguageTag ?? createTagFromOrthography(nextOrthography);
  }
</script>

<div class="min-h-screen bg-base-200 p-6" data-theme={theme}>
  <div class="mx-auto flex max-w-7xl flex-col gap-6">
    <div class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-3xl font-semibold">Svelte Language Chooser Demo</h1>
        <p class="mt-2 max-w-2xl text-sm text-base-content/70">
          This Storybook example embeds the chooser directly so you can test
          search, script selection, and custom tag submission without a page app
          shell.
        </p>
      </div>

      <label class="form-control w-full max-w-48">
        <div class="label">
          <span class="label-text">Theme</span>
        </div>
        <select class="select select-bordered" bind:value={theme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_20rem]">
      <div class="h-[720px] overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
        <LanguageChooser {onDismiss} {onOk} />
      </div>

      <aside class="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
        <h2 class="text-lg font-semibold">Submitted selection</h2>
        <div class="mt-4 space-y-3 text-sm">
          <div>
            <div class="text-base-content/60">Display name</div>
            <div class="font-medium">
              {orthography.language
                ? orthography.customDetails?.customDisplayName ||
                  defaultDisplayName(orthography.language, orthography.script)
                : "No language selected yet"}
            </div>
          </div>

          <div>
            <div class="text-base-content/60">Language code</div>
            <div class="font-mono">
              {orthography.language?.languageSubtag || "-"}
            </div>
          </div>

          <div>
            <div class="text-base-content/60">Script</div>
            <div>{orthography.script?.name || "-"}</div>
          </div>

          <div>
            <div class="text-base-content/60">Region</div>
            <div>{orthography.customDetails?.region?.name || "-"}</div>
          </div>

          <div>
            <div class="text-base-content/60">Dialect</div>
            <div>{orthography.customDetails?.dialect || "-"}</div>
          </div>

          <div>
            <div class="text-base-content/60">Language tag</div>
            <div class="font-mono break-all">{languageTag || "-"}</div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</div>