# node-salt-api
A simple Node.js package to send functions to Salt Stack salt-api via CherryPy.  
Use Salt modules from Node.js.

## Install

_TODO_

## Example

```
const Salt = require("salt-api");
const salt = salt({
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

> LICENSE: MIT
