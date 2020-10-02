import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Perfil = require("../../models/perfil");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	res.json(await Perfil.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idperfil = parseInt(req.query["idperfil"] as string);
	res.json(isNaN(idperfil) ? null : await Perfil.obter(idperfil));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let p = req.body as Perfil;
	jsonRes(res, 400, p ? await Perfil.criar(p) : "Dados inválidos");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let p = req.body as Perfil;
	if (p)
		p.idperfil = parseInt(req.body.idperfil);
	jsonRes(res, 400, (p && !isNaN(p.idperfil)) ? await Perfil.alterar(p) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idperfil = parseInt(req.query["idperfil"] as string);
	jsonRes(res, 400, isNaN(idperfil) ? "Dados inválidos" : await Perfil.excluir(idperfil));
}));

export = router;
