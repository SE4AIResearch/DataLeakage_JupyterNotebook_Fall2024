import * as vscode from 'vscode';

export async function quickFixLLM(startLine: number, endLine: number) {
    const editor = vscode.window.activeTextEditor;

    console.log('Fixing leakage for cell', startLine, 'line', endLine);

    if (editor) {
        const position = editor.selection.active;
        const document = editor.document;
        const prompt = `Fix all leakages related to line ${startLine}`;

        await vscode.commands.executeCommand('github.copilot.chat.fix', {
            prompt: prompt,
            position,
            document,
        });
    }
}
