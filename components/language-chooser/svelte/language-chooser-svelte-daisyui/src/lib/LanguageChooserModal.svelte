<script lang="ts">
  import type { IOrthography } from "@ethnolib/find-language";
  import LanguageChooser from "./LanguageChooser.svelte";

  let modal: HTMLDialogElement;

  let {
    show = $bindable(),
    orthography = $bindable(),
    languageTag = $bindable(),
  }: {
    show: () => void;
    orthography: IOrthography;
    languageTag?: string;
  } = $props();

  show = () => modal.showModal();

  function onDismiss() {
    modal.close();
  }

  function onOk(_orthography: IOrthography, _languageTag?: string) {
    orthography = _orthography;
    languageTag = _languageTag;
    modal.close();
  }
</script>

<dialog bind:this={modal} class="modal">
  <div class="modal-box w-11/12 max-w-4xl h-4/5 p-0">
    <LanguageChooser {onDismiss} {onOk} />
  </div>
</dialog>
