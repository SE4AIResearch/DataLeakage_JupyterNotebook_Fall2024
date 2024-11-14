import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { exec } from 'child_process';

export async function installLeakageFolder(
    context: vscode.ExtensionContext, 
    leakageFolder: vscode.Uri[]
): Promise<void> {
    const globalStoragePath = context.globalStorageUri.fsPath;
    const sourceFolderPath = leakageFolder[0].fsPath;

    console.log(globalStoragePath);

    try {
        await fs.ensureDir(globalStoragePath);
        await fs.copy(sourceFolderPath, globalStoragePath);

        console.log('Leakage program successfully copied!');
    }
    catch (err) {
        console.error('Error copying leakage program:', err);
        vscode.window.showErrorMessage('Error copying leakage program');
    }

    try {
        const pyrightDir = path.join(globalStoragePath, 'main', '_internal', 'pyright');

        exec('npm install pyright-1.1.188.tgz', { cwd: pyrightDir });
        console.log('Pyright successfully installed!');
    }
    catch (err) {
        console.error('Error installing Pyright:', err);
        vscode.window.showErrorMessage('Error installing Pyright module');
    }

    vscode.window.showInformationMessage('Leakage program successfully installed!');
}