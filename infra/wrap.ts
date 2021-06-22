import express = require("express");

export = function wrap(handler: (req: express.Request, res: express.Response, next: express.NextFunction) => (void | Promise<void>)): (req: express.Request, res: express.Response, next: express.NextFunction) => void {
	return function(req: express.Request, res: express.Response, next: express.NextFunction) {
		const r = handler(req, res, next);
		if (r)
			Promise.resolve(r).catch(next);
	};
}
