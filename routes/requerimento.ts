import express = require("express");
import wrap = require("express-async-error-wrapper");
import Ponto = require("../models/ponto");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/baterEntrada", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("requerimento/baterPonto", { titulo: "Marcar Entrada", usuario: u, entrada: true });
}));

router.all("/baterEntradaonline", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("requerimento/baterPonto", { titulo: "Marcar Entrada Online", usuario: u, entrada: true });
}));


router.all("/baterSaida", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("requerimento/baterPonto", { titulo: "Marcar Saída", usuario: u, entrada: false });
}));

router.all("/dayoff", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("requerimento/dayoff", { titulo: "Day off", usuario: u, item: null});
}));


export = router;
