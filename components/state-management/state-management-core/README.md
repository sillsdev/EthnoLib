# State Management Core

This package provides a simple interface for working with multiple reactive frameworks.

It assumes a view/view model architecture for your app. The view is responsible for what
the user sees, and the view model is responsible for the stateful logic that makes the view
operational.

This package establishes a convention for writing a view model in vanilla JavaScript and
your view in React, Svelte, or some other reactive framework.

This package exists for view models that are exposed as libraries. Since your view model
is not tied to a specific framework, developers can write their own views using their
framework of choice.

## Fields

A field represents a single piece of reactive data. Its usage is best explained with an example.

Suppose your app has a search bar. Every time the user changes the search text, the app
should perform a search.

Here's how you would define the search text field:

```js
const searchText = new Field("", (newSearchText) => {
  // This callback runs whenever the user changes the search text.
  searchFor(newSearchText);
});

// Get current value of the field
let text = searchText.value;

// Update the field and perform the search.
// This is how the UI should update the field.
searchText.requestUpdate("hello world");

// Update the field without performing the search.
// Your program can use this method internally to update the field without side effects.
searchText.value = "abc";
```

## View Models

In the context of this package, a view model is an object with fields.
To define a view model, write a function like the following:

```js
function usePersonViewModel() {
  // The view model can have fields...
  const name = new Field();
  const age = new Field();

  // ...and actions
  function haveBirthday() {
    age.value++;
  }

  return { name, age, haveBirthday };
}
```

## Usage in UI framework

Framework-specific adapters make view models accessible to your UI. For example,
if you framework is Svelte, use the `state-management-svelte` package:

```svelte
<script>
import { svelteViewModel } from "@ethnolib/state-management-svelte";

// svelteViewModel() turns all fields into reactive Svelte properties
const person = svelteViewModel(usePersonViewModel())

person.name = "John"  // Behind the scenes, this calls `requestUpdate`
</script>

<p>Hello, {person.name}!</p>
```

For more details, see documentation for `state-management-svelte` or the adapter for your
framework of choice.

Behind the scenes, the adapter does something like this to keep the view model in sync with the UI:

```js
const person = usePersonViewModel();

// Replace `defineReactiveState` with your framework's mechanism
const reactiveName = defineReactiveState();

/**
 * Establish a two-way binding between `reactiveName` and `person.name`:
 */

// Update the UI in response to the field
person.name.updateUI = (value) => {
  reactiveName = value; // Or however you update reactiveName in your framework
};

// Update the field in response to the UI.
// Replace `watch()` with whatever your framework uses to subscribe to a variable.
watch(reactiveName, (value) => person.name.requestUpdate(value));

/**
 * Now your UI can use `reactiveName` to interact with the name field.
 */
```
