import express = require("express");
import wrap = require("express-async-error-wrapper");
import Departamento = require("../models/departamento");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("departamento/alterar", { titulo: "Criar Departamento", usuario: u, item: null });
}));


router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["id_departamento"] as string);
		let item: Departamento = null;
		if (isNaN(id) || !(item = await Departamento.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("departamento/alterar", {
				titulo: "Editar Departamento",
				usuario: u,
				item: item
			});
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("departamento/listar", { titulo: "Gerenciar Departamentos", usuario: u, lista: JSON.stringify(await Departamento.listar()) });
}));


export = router;
