<script lang="ts">
  import { onMount } from "svelte";
  import "./app.css";
  import LanguageChooser from "./lib/LanguageChooser.svelte";
  import LanguageChooserModal from "./lib/LanguageChooserModal.svelte";
  import {
    defaultDisplayName,
    type IOrthography,
  } from "@ethnolib/find-language";

  let { name }: { name: string } = $props();

  let showModal = $state(() => {});
  let orthography: IOrthography = $state({});
  let languageTag: string | undefined = $state();
</script>

<main>
  <div class="m-8">
    <h1 class="text-4xl md:text-5xl mb-8">Language Chooser Demo</h1>

    <div class="flex">
      <div class="flex-1">
        <div class="card card-border w-96 bg-base-100 shadow-xl mb-8">
          <div class="card-body">
            <p>
              Language Display Name: {orthography.customDetails
                ?.customDisplayName ||
                defaultDisplayName(orthography.language, orthography.script)}
            </p>
            <p>Language Code: {orthography.language?.languageSubtag}</p>
            <p>Script: {orthography.script?.name}</p>
            <p>Region: {orthography.customDetails?.region?.name}</p>
            <p>Dialect: {orthography.customDetails?.dialect}</p>
            <p>Language Tag: {languageTag}</p>
          </div>
        </div>
        <button class="btn btn-primary" onclick={showModal}
          >Modify Language Selection</button
        >
      </div>
      <div class="flex-1">
        <h3>Choose Theme:</h3>
        <fieldset class="fieldset">
          <label class="flex gap-2 cursor-pointer items-center">
            <input
              type="radio"
              name="theme-radios"
              class="radio radio-sm theme-controller"
              value="light"
              checked
            />
            Light
          </label>
          <label class="flex gap-2 cursor-pointer items-center">
            <input
              type="radio"
              name="theme-radios"
              class="radio radio-sm theme-controller"
              value="dark"
            />
            Dark
          </label>
        </fieldset>
      </div>
    </div>
  </div>

  <LanguageChooserModal
    bind:show={showModal}
    bind:orthography
    bind:languageTag
  />
</main>
