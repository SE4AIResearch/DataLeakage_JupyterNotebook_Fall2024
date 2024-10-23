import * as vscode from "vscode";

export class LeakageInstances implements vscode.WebviewViewProvider {
	public static readonly viewType = "leakageInstances";
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView,
	context: vscode.WebviewViewResolveContext, _token:vscode.CancellationToken)
	{
		this._view = webviewView;
	}
}
