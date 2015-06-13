missile-server
============

small node static server


## Install

```
npm install missile-server
```

## Usage
```javascript
var Server = require('missile-server');


Server({
    staticRoot: './assets',
    port: 4000
});


// Visit the url http://127.0.0.1:4000
```
