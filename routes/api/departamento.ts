import express = require("express");
import wrap = require("../../infra/wrap");
import jsonRes = require("../../utils/jsonRes");
import Departamento = require("../../models/departamento");
import Usuario = require("../../models/usuario");

const router = express.Router();

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let t = req.body as Departamento;
	jsonRes(res, 400, t ? await Departamento.criar(t) : "Dados inválidos");
}));


router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Departamento.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id_departamento"] as string);
	res.json(isNaN(id) ? null : await Departamento.obter(id));
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let t = req.body as Departamento;
	if (t)
		t.id_departamento = parseInt(req.body.id_departamento);
	jsonRes(res, 400, (t && !isNaN(t.id_departamento)) ? await Departamento.alterar(t) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id_departamento"] as string);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos" : await Departamento.excluir(id));
}));



export = router;