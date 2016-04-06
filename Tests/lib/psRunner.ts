/// <reference path="../../definitions/node.d.ts"/>
/// <reference path="../../definitions/Q.d.ts"/>

import Q = require('q');
import events = require('events');
import fs = require('fs');
import path = require('path');
var shell = require('shelljs');
var exec = require('child_process').exec;

function debug(message) {
    if (process.env['TASK_TEST_TRACE']) {
        console.log(message);
    }
}

export function runPS(psPath: string, done) {
		var psr = new PSRunner(psPath);

		psr.run()
		.then(() => {
			done();
		})
		.fail((err) => {
			done(err);
		});	
}

export class PSRunner extends events.EventEmitter {
	constructor(psPath: string) {
		super();
		this._psPath = psPath;
	}
	
	public stderr: string;
	public stdout: string;

	private _psPath: string;
	
	//
	// stderr/out
	//

	public run(): Q.Promise<void> {
		this.emit('starting');
		var defer = Q.defer<void>();

		if (!fs.existsSync(this._psPath)) {
			throw (new Error('Ps1 does not exist: ' + this._psPath));
		}
		
		var wd = path.dirname(this._psPath);
		
		var psPath = shell.which('powershell');	
		var cmdLine = psPath + ' -NoLogo -Sta -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Import-Module -Name Microsoft.PowerShell.Management, Microsoft.PowerShell.Utility ; Set-Content variable:ErrorActionPreference \'Stop\' ; Set-Content variable:VerbosePreference ([System.Management.Automation.ActionPreference]::Continue) ; Set-Content variable:PSModuleAutoloadingPreference \'None\' ; & \'' + this._psPath + '\'"';
		var child = exec(cmdLine, 
						{ 
							cwd: wd, 
							// keep current env clean
							env: process.env
						},
			(err, stdout, stderr) => {
				if (stdout) {
					debug(stdout);
				}

				if (stderr) {
					debug('stderr:');
					debug(stderr);
				}

				if (err !== null) {
					defer.reject(err);
					return;
				}

				defer.resolve(null);
			});
		
		return <Q.Promise<void>>defer.promise;
	}	
}

