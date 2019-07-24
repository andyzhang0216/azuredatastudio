// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the Source EULA. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LiveShare, SharedServiceProxy } from './liveshare';
import { ConnectionProvider } from './providers/connectionProvider';
import { StatusProvider, LiveShareDocumentState } from './providers/statusProvider';
import { LiveShareServiceName } from './constants';

declare var require: any;
let vsls = require('vsls');

export class GuestSessionManager {
	private static readonly VslsPrefix: string = 'vsls';

	private _statusProvider: StatusProvider;

	constructor(
		context: vscode.ExtensionContext,
		vslsApi: LiveShare
	) {
		let self = this;
		vscode.workspace.onDidOpenTextDocument(params => this.onDidOpenTextDocument(params));

		vslsApi!.onDidChangeSession(async function onLiveShareSessionCHange(e: any) {
			const isHost = e.session.role === vsls.Role.Host;
			if (!e.session.id && isHost) {
				return;
			}

			const sharedServiceProxy: SharedServiceProxy = await vslsApi.getSharedService(LiveShareServiceName);
			if (!sharedServiceProxy) {
				vscode.window.showErrorMessage('Could not access a shared service. You have to set "liveshare.features" to "experimental" in your user settings in order to use this extension.');
				return;
			}

			new ConnectionProvider(isHost, sharedServiceProxy);

			self._statusProvider = new StatusProvider(isHost, vslsApi, sharedServiceProxy);
		});
	}

	private isLiveShareDocument(doc: vscode.TextDocument): boolean {
		return (doc && doc.uri.scheme.startsWith(GuestSessionManager.VslsPrefix));
	}

	private async onDidOpenTextDocument(doc: vscode.TextDocument): Promise<void> {
		if (this._statusProvider && this.isLiveShareDocument(doc)) {
			let documentState: LiveShareDocumentState = await this._statusProvider.getDocumentState(doc);
			if (documentState) {
				let outlog: string = `Document state: isConnected=${documentState.isConnected}, serverName=${documentState.serverName}, databaseName=${documentState.databaseName}`;
				console.log(outlog);
			}
		}
	}
}