<script lang="ts">
  import "./app.css";

  let { name }: { name: string } = $props();
</script>

<main>
  <h1>Welcome {name}!</h1>
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-primary">Hello DaisyUI!</h2>
      <p class="text-base-content">
        If you can see this styled card, Tailwind and DaisyUI are working
        correctly.
      </p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary">Get Started</button>
      </div>
    </div>
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
