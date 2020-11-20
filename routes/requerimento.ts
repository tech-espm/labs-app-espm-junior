import express = require("express");
import wrap = require("express-async-error-wrapper");
import Ponto = require("../models/ponto");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/baterPonto", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("requerimento/baterPonto", { titulo: "Bater Ponto", usuario: u, item: null });
}));

export = router;
