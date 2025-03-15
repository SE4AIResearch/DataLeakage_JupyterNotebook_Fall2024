/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createPopup() {
  // FIXME: Convert to tailwind in the future

  return html`<div class="popup">
    <div class="popup__title-wrapper">
      <h3 class="popup__title">Configure Settings</h3>
      <button class="popup__exit-btn">X</button>
    </div>
    <p class="popup__text">
      If this is your first time installing the extension, please click the
      settings icon in the top right of the sidebar, or feel free to
      <a class="popup__anchor-settings-btn"
        >click here to go to the settings page.</a
      >
    </p>
  </div>`;
}
