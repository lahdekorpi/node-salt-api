# node-salt-api [![Known Vulnerabilities](https://snyk.io/test/github/lahdekorpi/node-salt-api/badge.svg)](https://snyk.io/test/github/lahdekorpi/node-salt-api)
A simple Node.js package to send functions to Salt Stack salt-api via CherryPy.  
Use Salt modules from Node.js.

## Requirements

You need to have salt-api and CherryPy installed and configured.  
Please follow the [installation instructions of Salt netapi rest_cherrypy](https://docs.saltstack.com/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html).

## Install

`npm add salt-api`

## Usage

### First, require salt-api
`import { Salt } from "salt-api";`

### Configure
Configure the API via an object containing `url`, `username`, `password`.  
If needed, you can also provide `eauth`. Defaults to "pam".  

`const salt = new Salt(YourConfigObjectHere);`

### Debug

Add second param true for debug logs.  
`const salt = new Salt(YourConfigObjectHere, true);`

```js
{
  tgt: 'not master',
  fun: 'saltutil.refresh_pillar',
  client: 'local',
  tgt_type: 'compound',
  duration: 1.934
}
```

### Wait for authentication
Make sure salt-api is done with the authentication.

`await salt.login();`  

or  

```js
salt.login().then(() => {
	// Code
});
```

### Run functions

`salt.fun(target, function, funOptionsObjectHere)`  
`target` defaults to "*"  
`function` defaults to "test.ping"  
`client` defaults to "local"  

Example of funOptions object  
`salt.fun("not master", "saltutil.refresh_pillar", { tgt_type: "compound" });`

See more from Salt docs
- [https://docs.saltproject.io/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html](https://docs.saltproject.io/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html)
- [https://docs.saltproject.io/en/latest/ref/clients/index.html#salt.client.LocalClient.cmd](https://docs.saltproject.io/en/latest/ref/clients/index.html#salt.client.LocalClient.cmd)

Returns a Promise that resolves an object containing a return array with the data directly from the API.

### Get minions

`salt.minions(mid)`

`mid` optional minion id 

Returns a Promise that resolves an object containing a minon information in a return array with the data directly from the API.

### Get jobs

`salt.jobs(jid)`

`jid` optional job id

Returns a Promise that resolves an object containing the job information in a return array with the data directly from the API.

## Example

```js
import { Salt } from "salt-api";
const salt = new Salt({
	url: "http://localhost:8000",
	username: "salt",
	password: "secret"
});

salt.login().then(() => {

	// Same as running `salt "*" test.ping` in the command line
	salt.fun("*", "test.ping").then(data => {

		// Do something with the data
		console.log(data);
		// { return: [ { b827eb3aaaf7: true, b827ebcc82fe: true } ] }

	}).catch(e => console.error(e));

});
```

**LICENSE: MIT**
