import express = require("express");
import wrap = require("../infra/wrap");
import Ponto = require("../models/ponto");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");
import DayOff = require("../models/dayOff");
import DataUtil = require("../utils/dataUtil");
import Departamento = require("../models/departamento");
import Ciclo = require("../models/ciclo");

const router = express.Router();

router.all("/listarPonto", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		const anoMesAtual = DayOff.anoMesAtual();
		res.render("controle/listarPonto", {
			titulo: "Gerenciar Ponto",
			usuario: u,
			anoAtual: anoMesAtual.ano,
			mesAtual: anoMesAtual.mes,
			hoje: DataUtil.horarioDeBrasiliaISO(),
			departamentos: await Departamento.listar(),
			usuarios: await Usuario.listarDropDown(),
			lista: await Ponto.listar(anoMesAtual.ano, anoMesAtual.mes)
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
		const ciclos = await Ciclo.listar(u.idusuario);

		res.render("controle/daysOff", {
			titulo: "Days Off",
			usuario: u,
			ciclos,
			daysOff: ciclos[0] ? await DayOff.listarDaysOff(u.idusuario, ciclos[0].idciclo) : []
		});
	}
}));

router.all("/horasPessoais", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		const ciclos = await Ciclo.listar(u.idusuario);

		res.render("controle/horasPessoais", {
			titulo: "Horas Pessoais",
			usuario: u,
			ciclos,
			horasPessoais: ciclos[0] ? await DayOff.listarHoras(u.idusuario, ciclos[0].idciclo) : []
		});
	}
}));

export = router;
