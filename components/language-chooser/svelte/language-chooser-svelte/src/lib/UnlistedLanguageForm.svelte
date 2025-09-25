<script lang="ts">
  import { getAllRegions, type IRegion } from "@ethnolib/find-language";

  let {
    onSubmitClicked = $bindable(),
    submit,
  }: {
    onSubmitClicked: () => void;
    submit: (name: string, region: IRegion) => void;
  } = $props();

  const regions = getAllRegions().sort((a, b) => a.name.localeCompare(b.name));

  let name = $state("");
  let regionCode = $state("");

  let showErrors = $state(false);
  let isNameInvalid = $derived(showErrors && !name);
  let isRegionInvalid = $derived(showErrors && !regionCode);

  onSubmitClicked = () => {
    showErrors = true;
    const region = regions.find((r) => r.code === regionCode);
    if (name && region) {
      submit(name, region);
    }
  };
</script>

<div class="mb-4">
  <label>
    <span class="font-semibold opacity-70">Name</span>
    <input
      class="input w-full"
      class:input-error={isNameInvalid}
      bind:value={name}
    />
    {#if isNameInvalid}
      <p class="text-sm text-error">Required</p>
    {/if}
  </label>
</div>

<div class="mb-4">
  <label>
    <span class="font-semibold opacity-70">Country</span>
    <select
      class="select w-full"
      class:select-error={isRegionInvalid}
      bind:value={regionCode}
    >
      <option disabled selected value="">Select a country</option>
      {#each regions as region}
        <option value={region.code}>{region.name}</option>
      {/each}
    </select>
    {#if isRegionInvalid}
      <p class="text-sm text-error">Required</p>
    {/if}
  </label>
</div>
