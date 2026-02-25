<script lang="ts">
  import { highlightMatches } from "@ethnolib/language-chooser-controller";

  const {
    text,
    matchWith,
    highlight,
    truncate = false,
  }: {
    text: string | undefined;
    matchWith: string;
    highlight: boolean;
    truncate?: boolean;
  } = $props();

  const segments = $derived(highlightMatches(matchWith, text ?? ""));
</script>

<span class:line-clamp-2={truncate}>
  {#each segments as segment}
    {#if highlight && segment.isHighlighted}
      <span class="text-primary font-semibold">{segment.text}</span>
    {:else}
      {segment.text}
    {/if}
  {/each}
</span>
