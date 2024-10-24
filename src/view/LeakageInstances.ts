/*
MIT License

Copyright (c) 2015-present Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import * as vscode from "vscode";

export class LeakageInstances {
	constructor(context: vscode.ExtensionContext) {
		const view = vscode.window.createTreeView('leakageInstances',
			{ treeDataProvider: aNodeWithIdTreeDataProvider(), showCollapseAll: false });
		context.subscriptions.push(view);
		vscode.commands.registerCommand('leakageInstances.reveal', async () => {
			const key = await vscode.window.showInputBox({ placeHolder:
				'Type the label of the item to reveal' });
			if (key) {
				await view.reveal({ key }, { focus: true, select: false, expand: true });
			}
		});
		vscode.commands.registerCommand('leakageInstances.changeTitle', async () => {
			const title = await vscode.window.showInputBox({ prompt:
				'Type the new title for the Test View', placeHolder: view.title });
			if (title) {
				view.title = title;
			}
		});
	}
}

const tree: any = {
	Overlap: {},
	Preprocessing: {},
	"Multi-Test": {}
};
const nodes: any = {};

function aNodeWithIdTreeDataProvider(): vscode.TreeDataProvider<{ key: string }>
{
	return {
		getChildren: (element: { key: string }): { key: string }[] => {
			return getChildren(element ? element.key : undefined).map(key => getNode(key));
		},
		getTreeItem: (element: { key: string }): vscode.TreeItem => {
			const treeItem = getTreeItem(element.key);
			treeItem.id = element.key;
			return treeItem;
		},
		getParent: ({ key }: { key: string }): { key: string } | undefined => {
			const parentKey = key.substring(0, key.length - 1);
			return parentKey ? new Key(parentKey) : undefined;
		}
	};
}

function getChildren(key: string | undefined): string[]
{
	if (!key) {
		return Object.keys(tree);
	}
	const treeElement = getTreeElement(key);
	if (treeElement) {
		return Object.keys(treeElement);
	}
	return [];
}

function getTreeItem(key: string): vscode.TreeItem
{
	const treeElement = getTreeElement(key);

	const tooltip = new vscode.MarkdownString(`$(zap) Tooltip for ${key}`, true);
	return {
		label: <any>{ label: key, highlights: key.length > 1 ? [[key.length - 2, key.length - 1]] : void 0 },
		tooltip, collapsibleState: treeElement && Object.keys(treeElement).length ?
		vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
	};
}

function getTreeElement(element: string): any
{
	let parent = tree;
	for (let i = 0; i < element.length; i++) {
		parent = parent[element.substring(0, i + 1)];
		if (!parent) {
			return null;
		}
	}
	return parent;
}

function getNode(key: string): { key: string }
{
	if (!nodes[key]) {
		nodes[key] = new Key(key);
	}
	return nodes[key];
}

class Key {
	constructor(readonly key: string) { }
}
