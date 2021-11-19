import express = require("express");
import wrap = require("../infra/wrap");
import Ponto = require("../models/ponto");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");
import DayOff = require("../models/dayOff");
import DataUtil = require("../utils/dataUtil");

const router = express.Router();

router.all("/listarPonto", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		const infoAtual = DayOff.infoAtualSemCiclo();
		res.render("controle/listarPonto", {
			titulo: "Gerenciar Ponto",
			usuario: u,
			anoAtual: infoAtual.anoAtual,
			mesAtual: infoAtual.mesAtual,
			hoje: DataUtil.hojeISO(),
			usuarios: await Usuario.listarDropDown(),
			lista: await Ponto.listar(infoAtual.anoAtual, infoAtual.mesAtual)
		});
	}
}));

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
	if (!u) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		const infoAtual = await DayOff.infoAtual();

		res.render("controle/daysOff", {
			titulo: "Days Off",
			usuario: u,
			anoAtual: infoAtual.anoAtual,
			cicloAtual: infoAtual.cicloAtual,
			daysOff: await DayOff.listar(infoAtual.anoAtual, infoAtual.cicloAtual, u.idusuario)
		});
	}
}));

router.get("/gerenciarCicloAtual", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		const infoAtual = await DayOff.infoAtual();
		res.render("controle/gerenciarCicloAtual", {
			titulo: "Gerenciar Ciclo Atual",
			usuario: u,
			infoAtual
		});
	}
}));

export = router;
