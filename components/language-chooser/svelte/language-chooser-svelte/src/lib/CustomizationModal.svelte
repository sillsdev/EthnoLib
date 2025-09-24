<script lang="ts">
  import type { IRegion, IScript } from "@ethnolib/find-language";
  import UnlistedLanguageForm from "./UnlistedLanguageForm.svelte";
  import CustomizationForm from "./CustomizationForm.svelte";
  import type { SvelteViewModel } from "@ethnolib/state-management-svelte";
  import type { LanguageChooserViewModel } from "@ethnolib/language-chooser-controller";

  let modal: HTMLDialogElement;

  let {
    languageChooser,
  }: {
    languageChooser: SvelteViewModel<LanguageChooserViewModel>;
  } = $props();

  let isCreatingUnlisted = $state(false);

  languageChooser.showUnlistedLanguageModal = () => {
    isCreatingUnlisted = true;
    modal.showModal();
  };

  languageChooser.showCustomizeLanguageModal = () => {
    isCreatingUnlisted = false;
    modal.showModal();
  };

  let title = $derived(
    isCreatingUnlisted ? "Unlisted Language Tag" : "Custom Language Tag"
  );

  function onDismiss() {
    modal.close();
  }

  let onOk = $state(() => {});

  function submitUnlisted(name: string, region: IRegion) {
    languageChooser.submitUnlistedLanguageModal({ name, region });
    modal.close();
  }

  function submitCustomization(
    script?: IScript,
    region?: IRegion,
    dialect?: string
  ) {
    languageChooser.submitCustomizeLangaugeModal({ script, region, dialect });
    modal.close();
  }
</script>

<dialog bind:this={modal} class="modal">
  <div class="modal-box">
    <h3 class="text-xl font-semibold mb-4">{title}</h3>

    {#if isCreatingUnlisted}
      <UnlistedLanguageForm
        bind:onSubmitClicked={onOk}
        submit={submitUnlisted}
      />
    {:else}
      <CustomizationForm
        bind:onSubmitClicked={onOk}
        submit={submitCustomization}
      />
    {/if}

    <div class="modal-action">
      <button class="btn btn-primary w-24" onclick={onOk}>Ok</button>
      <button class="btn w-24" onclick={onDismiss}>Cancel</button>
    </div>
  </div>
</dialog>
