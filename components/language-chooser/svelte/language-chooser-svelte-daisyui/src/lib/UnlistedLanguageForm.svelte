<script lang="ts">
  import { getAllRegions, type IRegion } from "@ethnolib/find-language";

  let {
    populate = $bindable(),
    onSubmitClicked = $bindable(),
    submit,
  }: {
    populate: (fields: { name?: string; region?: IRegion }) => void;
    onSubmitClicked: () => void;
    submit: (name: string, region: IRegion) => void;
  } = $props();

  const regions = getAllRegions().sort((a, b) => a.name.localeCompare(b.name));

  let name = $state("");
  let regionCode = $state("");

  let showErrors = $state(false);
  let isNameInvalid = $derived(showErrors && !name);
  let isRegionInvalid = $derived(showErrors && !regionCode);

  populate = (fields) => {
    name = fields.name ?? "";
    regionCode = fields.region?.code ?? "";
    showErrors = false;
  };

  onSubmitClicked = () => {
    showErrors = true;
    const region = regions.find((r) => r.code === regionCode);
    if (name && region) {
      submit(name, region);
    }
  };
</script>

<div class="card card-border border-info text-sm mb-4 p-4">
  If you cannot find a language and it does not appear in ethnologue.com, you
  can instead define the language here.
</div>

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
