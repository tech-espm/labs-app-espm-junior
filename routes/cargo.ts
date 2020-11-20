import express = require("express");
import wrap = require("express-async-error-wrapper");
import Cargo = require("../models/cargo");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("cargo/alterar", { titulo: "Criar Cargo", usuario: u, item: null });
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["idcargo"] as string);
		let item: Cargo = null;
		if (isNaN(id) || !(item = await Cargo.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("cargo/alterar", { titulo: "Editar Cargo", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("cargo/listar", { titulo: "Gerenciar Cargos", usuario: u, lista: JSON.stringify(await Cargo.listar()) });
}));

export = router;
