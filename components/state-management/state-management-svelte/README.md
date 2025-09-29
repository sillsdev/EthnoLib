# State Management Adapter for Svelte

If you're writing view models with `state-management-core`, this package
lets you use view models in Svelte.

Wrap your view models in `svelteViewModel()`. After that, usage is no different
than ordinary Svelte!

```svelte
<script>
    import { svelteViewModel } from "@ethnolib/state-management-svelte";

    // Define your view model
    function usePersonViewModel() {
        const name = new Field("John")

        const age = new Field(5, (myAge) => {
            console.log(`I am now ${myAge}`)
        })

        // Since this isn't a field, it won't be reactive
        let language = "English"

        function haveBirthday() {
            this.age.value++
        }

        return { name, age, language, haveBirthday }
    }

    const person = svelteViewModel(usePersonViewModel());

    // Fields like `age` are now reactive properties
    let nextAge = $derived(person.age + 1)

    // In TypeScript, `language` is marked readonly because it's not reactive
    console.log(person.language)

    // Setting a property calls `requestUpdate` on the field
    person.age = 10 // Logs "I am now 10" to the console
</script>

<input bind:value={person.name}>
<p>Hello, my name is {person.name}. I am {person.age}, but soon I'll be {nextAge} </p>

<button onclick={person.haveBirthday}>Have a birthday!</button>
```

If you have nested view models, be sure to call `svelteViewModel` for each one:

```svelte
<script>
    function useDirectoryViewModel() {
        // The view model has a dynamic list of view models
        const people = new Field([
            usePersonViewModel(),
            usePersonViewModel(),
            // ...
        ])

        return { people }
    }

    const directory = svelteViewModel(useDirectoryViewModel())
</script>

<ul>
    <!-- Note that we're applying svelteViewModel to each item -->
    {#each directory.people.map(svelteViewModel) as person}
        <li>{person.name}</li>
    {/each}
</ul>
```
