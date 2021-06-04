import express = require("express");
import wrap = require("express-async-error-wrapper");
import multer = require("multer");
import Evento = require("../models/evento");
import Sala = require("../models/sala");
import Departamento = require("../models/departamento");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("evento/alterar", {
			titulo: "Criar Evento",
			usuario: u,
			salas: await Sala.listar(),
			departamentos: await Departamento.listar(),
			item: null
		});
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["id_evento"] as string);
		let item: Evento = null;
		if (isNaN(id) || !(item = await Evento.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("evento/alterar", {
				titulo: "Editar Evento",
				usuario: u,
				salas: await Sala.listar(),
				departamentos: await Departamento.listar(),
				item: item
			});
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else{
		const hoje = new Date(),
			anoAtual = hoje.getFullYear(),
			mesAtual = hoje.getMonth() + 1;
		res.render("evento/listar", {
			titulo: "Gerenciar Eventos",
			usuario: u,
			anoAtual: anoAtual,
			mesAtual: mesAtual,
			lista: JSON.stringify(await Evento.listar(0, 0, anoAtual, mesAtual)),
			departamentos: await Departamento.listar(),
			salas: await Sala.listar()
		});
	}
		
		
}));
router.all("/upload", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else{

		res.render("evento/upload", {
			titulo: "Upload de Eventos",
			usuario: u
		});
		
	}

}));
router.all("/download/:iddepartamento", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else{
		const hoje = new Date(),
		anoAtual = hoje.getFullYear();
		
		res.render("evento/download", {
			layout: "layout-vazio",
			titulo: "Plano de Eventos",
			usuario: u,
			anoAtual: anoAtual,
			lista: await Evento.listarOcorrencias(parseInt(req.params["iddepartamento"]), 0, anoAtual),
			departamentos: await Departamento.listar()
		});	
	}
}));

export = router;