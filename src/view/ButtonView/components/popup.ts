/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createPopup() {
  // FIXME: Convert to tailwind in the future

  return html`<div
    class="popup flex flex-col pb-4 pt-2 px-5 mt-4 bg-neutral-500/35"
  >
    <div class="flex justify-end">
      <button
        class="popup__exit-btn text-neutral-700 dark:text-neutral-300 cursor-pointer font-bold text-lg"
      >
        X
      </button>
    </div>

    <div class="flex justify-center items-center mb-2">
      <h3
        class="text-2xl font-bold text-neutral-800 dark:text-neutral-200 text-center"
      >
        Configure Settings
      </h3>
    </div>

    <div class="mb-2">
      <p class="text-neutral-700 dark:text-neutral-300 text-center">
        First time installing?
      </p>
    </div>

    <div class="">
      <p class="text-neutral-700 dark:text-neutral-300 text-center">
        Click the gear icon above, or below
      </p>
      <div class="flex justify-center items-center">
        <a class="popup__anchor-settings-btn cursor-pointer font-semibold"
          >click here</a
        >
      </div>
    </div>
  </div>`;
}
