# node-salt-api [![Known Vulnerabilities](https://snyk.io/test/github/lahdekorpi/node-salt-api/badge.svg)](https://snyk.io/test/github/lahdekorpi/node-salt-api)
A simple Node.js package to send functions to Salt Stack salt-api via CherryPy.  
Use Salt modules from Node.js.

## Requirements

You need to have salt-api and CherryPy installed and configured.  
Please follow the [installation instructions of Salt netapi rest_cherrypy](https://docs.saltproject.io/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html).

## Install

`npm add salt-api axios eventsource`

> **Note on `peerDependencies`:** `axios` and `eventsource` are defined as peer dependencies in this package. This allows you to bring your own versions of these dependencies so that they are not unnecessarily duplicated in your node_modules, reducing bundle sizes and potential conflicts. Depending on your package manager and its configuration, you may need to install them manually as shown above.

## Usage

### First, require salt-api
`import { Salt } from "salt-api";`

### Configure

Configure the API via an object containing at least `url`. Typically, you will also provide `username`, and `password` or a pre-existing `token`.
If needed, you can also provide `eauth`. Defaults to `"pam"`.

```js
const config = {
  url: "http://localhost:8000",
  username: "myuser",
  password: "mypassword",
  eauth: "pam"
};

const salt = new Salt(config, false, undefined);
```

#### Custom Axios Instance

You can provide an optional third parameter to the constructor to use a custom Axios instance. This is highly useful if you need to provide an internal certificate, an HTTPS agent, or a proxy.

```js
import https from "https";
import axios from "axios";

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

const salt = new Salt(config, false, axiosInstance);
```

### Debug

Add the second parameter as `true` to enable debug logs. These logs provide you with insights on request times and parameters directly in your console.
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

### Events

`salt.eventSource()`

Opens connection to An HTTP stream of the Salt Master Event Bus and returns EventSource.

```js

const events = await salt.eventSource()
events.onopen = () => {
	console.log("Connected to Salt Master Event Bus")
}

events.onmessage = async (data) => {
	console.log("Got event from Salt Master Events Bus", data)
	// Do something with the data
}

events.onerror = async (err) => {
	if (err?.status === 401 || err?.status === 403) {
		console.log("Not authorized")
	};
}
```

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
