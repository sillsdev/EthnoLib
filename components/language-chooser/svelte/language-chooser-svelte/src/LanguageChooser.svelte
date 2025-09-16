<script lang="ts">
  import LanguageCard from "./LanguageCard.svelte";

  const { onDismiss }: { onDismiss: () => void } = $props();
</script>

<div class="h-full flex flex-col">
  <h3 class="text-3xl p-4 border-b-2 border-base-300 flex-none">
    Choose Language
  </h3>

  <div class="flex flex-1 min-h-0">
    <div class="flex-1 flex flex-col min-h-0 bg-base-200 p-4">
      <div class="flex-none pb-1">
        <label class="input w-full">
          <svg
            class="h-[1em] opacity-50"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <g
              stroke-linejoin="round"
              stroke-linecap="round"
              stroke-width="2.5"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </g>
          </svg>

          <input type="search" placeholder="Search by name, code, or country" />
        </label>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0">
        <LanguageCard title="English" code="en" />

        <LanguageCard
          title="Creole"
          secondTitle="Leeward Caribbean English Creole"
          code="alg"
          isSelected={true}
          body={[
            "A language of Antigua and Barbuda",
            "Anguillan Creole English, Something else, lots and lots and lots of other names, and even more names",
          ]}
        />

        <LanguageCard title="Spanish" code="es" />
        <LanguageCard title="French" code="fr" />
        <LanguageCard title="German" code="de" />
        <LanguageCard title="Italian" code="it" />
        <LanguageCard title="Portuguese" code="pt" />
        <LanguageCard title="Russian" code="ru" />
        <LanguageCard title="Japanese" code="ja" />
        <LanguageCard title="Chinese" code="zh" />
      </div>

      <div class="flex-none py-2">
        <div
          class="card card-xs card-border border-base-300 bg-base-100 hover:bg-base-300 shadow-xl w-48 pl-2"
        >
          <button class="card-body text-left" onclick={() => console.log("hi")}>
            <p class="card-title uppercase">Customize</p>
            <div class="flex">
              <p class="flex-1 font-mono text-sm opacity-60">qaa-x-</p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col p-6">
      <div class="flex-1"></div>
      <div class="flex-none">
        <label>
          <span class="font-semibold opacity-70"
            >Display this language this way</span
          >
          <input class="input input-xl w-full" />
        </label>
        <div class="font-mono opacity-70 p-2"><p>eng</p></div>
        <div class="flex justify-end">
          <button
            class="btn btn-primary uppercase w-24 mx-1"
            onclick={onDismiss}>Ok</button
          >
          <button class="btn uppercase w-24 mx-1" onclick={onDismiss}
            >Cancel</button
          >
        </div>
      </div>
    </div>
  </div>
</div>
