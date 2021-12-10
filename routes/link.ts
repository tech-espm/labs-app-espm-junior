import express = require("express");
import wrap = require("../infra/wrap");
import Link = require("../models/link");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("link/alterar", { titulo: "Criar Link Importante", usuario: u, item: null });
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect(appsettings.root + "/acesso");
	} else {
		let id = parseInt(req.query["id_link"] as string);
		let item: Link = null;
		if (isNaN(id) || !(item = await Link.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("link/alterar", { titulo: "Editar Link Importante", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u)
		res.redirect(appsettings.root + "/acesso");
	else
		res.render("link/listar", { titulo: (u.admin ? "Gerenciar Links Importantes" : "Links Importantes"), usuario: u, lista: JSON.stringify(await Link.listar()) });
}));

export = router;
