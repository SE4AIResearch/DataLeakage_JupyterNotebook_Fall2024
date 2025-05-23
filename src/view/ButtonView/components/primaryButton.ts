/**
 * html wrapper is needed for prettier formatting
 */
const html = String.raw;

export function createPrimaryButton(
  text: string,
  id: string | undefined,
  hidden: boolean = false,
) {
  return html`
    <div class="relative">
      <button
        class="
          px-8 py-1 w-full text-center rounded-sm
          text-(--vscode-button-foreground) 
          bg-(--vscode-button-background) 
          hover:cursor-pointer 
          hover:bg-(--vscode-button-hoverBackground)
          active:absolute
          active:top-1
          focus:outline-(--vscode-focusBorder) 
          disabled:cursor-progress 
          disabled:bg-vscode-button-disabledBackground
          ${hidden ? 'hidden' : ''}
        "
        id="${id}"
      >
        ${text}
      </button>
    </div>
  `;
}
