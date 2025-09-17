<script lang="ts">
  import LanguageChooser from "./LanguageChooser.svelte";

  let modal: HTMLDialogElement;

  let { show = $bindable() }: { show: () => void } = $props();

  show = () => modal.showModal();

  function onDismiss() {
    modal.close();
  }
</script>

<dialog bind:this={modal} class="modal">
  <div class="modal-box w-11/12 max-w-4xl h-4/5 p-0">
    <LanguageChooser {onDismiss} />
  </div>
</dialog>
