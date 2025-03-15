/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createPrimaryButton(text: string, id: string | undefined) {
  return html`<button
    class="
      px-8 py-2 w-full text-center 
      text-(--vscode-button-foreground) 
      bg-(--vscode-button-background) 
      hover:cursor-pointer 
      hover:bg-(--vscode-button-hoverBackground) 
      focus:outline-(--vscode-focusBorder) 
      disabled:cursor-progress 
      disabled:bg-[color-mix(in srgb, var(--vscode-button-background), grey 50%)]
    "
  >
    ${text}
  </button> `;
}
