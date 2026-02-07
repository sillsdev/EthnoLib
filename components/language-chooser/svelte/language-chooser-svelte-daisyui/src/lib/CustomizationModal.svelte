<script lang="ts">
  import {
    isValidBcp47Tag,
    type IRegion,
    type IScript,
  } from "@ethnolib/find-language";
  import UnlistedLanguageForm from "./UnlistedLanguageForm.svelte";
  import CustomizationForm from "./CustomizationForm.svelte";
  import type { SvelteViewModel } from "@ethnolib/state-management-svelte";
  import type { LanguageChooserViewModel } from "@ethnolib/language-chooser-controller";

  let modal: HTMLDialogElement;

  let {
    languageChooser,
    closeModal = $bindable(),
  }: {
    languageChooser: SvelteViewModel<LanguageChooserViewModel>;
    closeModal: () => void;
  } = $props();

  closeModal = () => modal.close();
  let isCreatingUnlisted = $state(false);

  let populateUnlistedForm = $state(
    (fields: { name?: string; region?: IRegion }) => {}
  );

  let populateCustomizeForm = $state(
    (fields: { script?: IScript; region?: IRegion; dialect?: string }) => {}
  );

  languageChooser.showUnlistedLanguageModal = (fields) => {
    isCreatingUnlisted = true;
    populateUnlistedForm(fields);
    modal.showModal();
  };

  languageChooser.showCustomizeLanguageModal = (fields) => {
    isCreatingUnlisted = false;
    populateCustomizeForm(fields);
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
    languageChooser.submitCustomizeLanguageModal({ script, region, dialect });
    modal.close();
  }
</script>

<dialog bind:this={modal} class="modal">
  <div class="modal-box">
    <h3 class="text-xl font-semibold mb-4">{title}</h3>

    {#if isCreatingUnlisted}
      <UnlistedLanguageForm
        bind:populate={populateUnlistedForm}
        bind:onSubmitClicked={onOk}
        submit={submitUnlisted}
      />
    {:else}
      <CustomizationForm
        bind:populate={populateCustomizeForm}
        bind:onSubmitClicked={onOk}
        submit={submitCustomization}
      />
    {/if}

    <div class="flex mt-8">
      <div class="flex-1">
        <button
          class="btn btn-ghost"
          onclick={() => languageChooser.promptForCustomTag()}
          >Enter Custom Tag</button
        >
      </div>
      <div>
        <button class="btn btn-primary w-24 mr-1" onclick={onOk}>Ok</button>
        <button class="btn w-24" onclick={onDismiss}>Cancel</button>
      </div>
    </div>
  </div>
</dialog>
