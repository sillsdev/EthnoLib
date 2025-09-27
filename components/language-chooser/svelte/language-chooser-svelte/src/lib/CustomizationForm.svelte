<script lang="ts">
  import {
    getAllRegions,
    type IScript,
    type IRegion,
    getAllScripts,
  } from "@ethnolib/find-language";

  let {
    populate = $bindable(),
    onSubmitClicked = $bindable(),
    submit,
  }: {
    populate: (withFields: {
      script?: IScript;
      region?: IRegion;
      dialect?: string;
    }) => void;
    onSubmitClicked: () => void;
    submit: (script?: IScript, region?: IRegion, name?: string) => void;
  } = $props();

  const regions = getAllRegions().sort((a, b) => a.name.localeCompare(b.name));
  const scripts = getAllScripts().sort((a, b) => a.name.localeCompare(b.name));

  let scriptCode: string | undefined = $state();
  let regionCode: string | undefined = $state();
  let name: string | undefined = $state();

  populate = (fields) => {
    scriptCode = fields.script?.code;
    regionCode = fields.region?.code;
    name = fields.dialect;
  };

  onSubmitClicked = () => {
    const region = regions.find((r) => r.code === regionCode);
    const script = scripts.find((s) => s.code === scriptCode);
    submit(script, region, name);
  };
</script>

<div class="mb-4">
  <label>
    <span class="font-semibold opacity-70">Script</span>
    <select class="select w-full" bind:value={scriptCode}>
      <option selected value=""></option>
      {#each scripts as script}
        <option value={script.code}>{script.name}</option>
      {/each}
    </select>
  </label>
</div>

<div class="mb-4">
  <label>
    <span class="font-semibold opacity-70">Country</span>
    <select class="select w-full" bind:value={regionCode}>
      <option selected value=""></option>
      {#each regions as region}
        <option value={region.code}>{region.name}</option>
      {/each}
    </select>
  </label>
</div>

<div class="mb-4">
  <label>
    <span class="font-semibold opacity-70">Variant (dialect)</span>
    <input class="input w-full" bind:value={name} />
  </label>
</div>
