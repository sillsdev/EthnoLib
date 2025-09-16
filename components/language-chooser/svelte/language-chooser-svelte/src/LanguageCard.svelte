<script lang="ts">
  const {
    title,
    secondTitle,
    code,
    body,
    isSelected,
  }: {
    title: string;
    secondTitle?: string;
    code: string;
    body?: string[];
    isSelected?: boolean;
  } = $props();
</script>

<div
  class="card card-border shadow-md my-2"
  class:text-primary-content={isSelected}
  class:bg-primary={isSelected}
  class:bg-base-100={!isSelected}
  class:hover:bg-base-300={!isSelected}
>
  <button class="card-body text-left">
    <div class="flex">
      <div class="text-lg flex-1">{title}</div>
      <div class="flex-none mr-4">{secondTitle}</div>
      <div class="flex-none font-mono opacity-70">{code}</div>
    </div>
    <div>
      {#each body ?? [] as bodyText}
        <p class="mt-2 text-sm opacity-80">{bodyText}</p>
      {/each}
    </div>
  </button>
</div>
