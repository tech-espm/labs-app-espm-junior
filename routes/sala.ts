import express = require("express");
import wrap = require("../infra/wrap");
import Sala = require("../models/sala");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("sala/alterar", { titulo: "Criar Sala", usuario: u, item: null });
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["id_sala"] as string);
		let item: Sala = null;
		if (isNaN(id) || !(item = await Sala.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("sala/alterar", {
				titulo: "Editar Sala",
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
		res.render("sala/listar", { titulo: "Gerenciar Salas", usuario: u, lista: JSON.stringify(await Sala.listar()) });
}));

export = router;
