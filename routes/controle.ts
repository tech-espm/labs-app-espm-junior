import express = require("express");
import wrap = require("../infra/wrap");
import Ponto = require("../models/ponto");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");
import DayOff = require("../models/dayoff");

const router = express.Router();

router.all("/marcarEntrada", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("controle/marcarPonto", { titulo: "Marcar Entrada", usuario: u, entrada: true, online: false });
}));

router.all("/marcarEntradaOnline", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("controle/marcarPonto", { titulo: "Marcar Entrada Online", usuario: u, entrada: true, online: true });
}));

router.all("/marcarSaida", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("controle/marcarPonto", { titulo: "Marcar Saída", usuario: u, entrada: false });
}));

router.all("/daysOff", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("controle/daysOff", {
			titulo: "Days Off",
			usuario: u,
			daysOff: await DayOff.listar(0, 0, u.idusuario)
		});
}));

export = router;
