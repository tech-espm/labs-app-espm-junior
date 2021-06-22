import express = require("express");
import wrap = require("../infra/wrap");
import appsettings = require("../appsettings");
import Cargo = require("../models/cargo");
import Curso = require("../models/curso");
import DayOff = require("../models/dayOff");
import DataUtil = require("../utils/dataUtil");
import Departamento = require("../models/departamento");
import Evento = require("../models/evento");
import Sala = require("../models/sala");
import Perfil = require("../models/perfil");
import Usuario = require("../models/usuario");

const router = express.Router();

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect(appsettings.root + "/login");
	} else {
		const infoAtual = DayOff.infoAtual();

		let opcoes = {
			titulo: "Calendário",
			usuario: u,
			anoAtual: infoAtual.anoAtual,
			mesAtual: infoAtual.mesAtual,
			daysOff: await DayOff.listar(infoAtual.anoAtual, infoAtual.semestreAtual),
			lista: await Evento.listarOcorrencias(0, 0, infoAtual.anoAtual, infoAtual.mesAtual),
			hoje: DataUtil.hojeISO(),
			departamentos: await Departamento.listar(),
			salas: await Sala.listar()
		};

		res.render("home/calendario", opcoes);
	}
}));

router.all("/offline", wrap(async (req: express.Request, res: express.Response) => {
	res.render("home/offline", { layout: "layout-vazio" });
}));

router.all("/manifest.webmanifest", wrap(async (req: express.Request, res: express.Response) => {
	res.contentType("application/manifest+json").render("home/manifest", { layout: "layout-vazio" });
}));

router.all("/sw.js", wrap(async (req: express.Request, res: express.Response) => {
	res.contentType("text/javascript").render("home/sw", { layout: "layout-vazio" });
}));

router.all("/login", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		const token = req.query["token"] as string;

		if (token) {
			const [mensagem, u] = await Usuario.efetuarLogin(token, res);
			if (mensagem)
				res.render("home/login", { layout: "layout-externo", mensagem: mensagem, ssoRedir: appsettings.ssoRedir });
			else
				res.redirect(appsettings.root + "/");
		} else {
			res.render("home/login", { layout: "layout-externo", mensagem: null, ssoRedir: appsettings.ssoRedir });
		}
	} else {
		res.redirect(appsettings.root + "/");
	}
}));

router.get("/acesso", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/login");
	else
		res.render("home/acesso", { titulo: "Sem Permissão", usuario: u });
}));

router.get("/perfil", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/");
	else
		res.render("home/perfil", { titulo: "Meu Perfil", usuario: u, perfis: await Perfil.listar(), cargos: await Cargo.listar(), cursos: await Curso.listar() });
}));

router.get("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (u)
		await u.efetuarLogout(res);
	res.redirect(appsettings.root + "/");
}));

router.get("/qr", wrap(async (req: express.Request, res: express.Response) => {
	res.render("home/qr", { layout: "layout-externo" });
}));

export = router;
