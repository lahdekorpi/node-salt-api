# node-salt-api
A simple Node.js package to send functions to Salt Stack salt-api via CherryPy.  
Use Salt modules from Node.js.

## Requirements

You need to have salt-api and CherryPy installed and configured.  
Please follow the [installation instructions of Salt netapi rest_cherrypy](https://docs.saltstack.com/en/latest/ref/netapi/all/salt.netapi.rest_cherrypy.html).

## Install

`npm add salt-api`

## Usage

### First, require salt-api
`const Salt = require("salt-api");`

### Configure
Configure the API via an object containing `url`, `username`, `password`.  
If needed, you can also provide `eauth`. Defaults to "pam".  

`const salt = new Salt(YourConfigObjectHere);`

### Wait for authentication
Make sure salt-api is done with the authentication.

`await salt.ready;`  

or  

```js
salt.ready.then(() => {
	// Code
});
```

### Run functions

`salt.fun(target, function, arguments, keyword arguments, client)`

`target` defaults to "*"  
`function` defaults to "test.ping"  
`arg` defaults to false, not sent  
`kwarg` defaults to false, not sent  
`client` defaults to "local"  

Returns a Promise that resolves an object containing a return array with the data directly from the API.

## Example

```js
const Salt = require("salt-api");
const salt = salt({
	url: "http://localhost:8000",
	username: "salt",
	password: "secret"
});

salt.ready.then(() => {

	// Same as running `salt "*" test.ping` in the command line
	salt.fun("*", "test.ping").then(data => {

		// Do something with the data
		console.log(data);
		// { return: [ { b827eb3aaaf7: true, b827ebcc82fe: true } ] }

	}).catch(e => console.error(e));

});
```

**LICENSE: MIT**
