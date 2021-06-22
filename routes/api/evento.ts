import express = require("express");
import wrap = require("../../infra/wrap");
import jsonRes = require("../../utils/jsonRes");
import Evento = require("../../models/evento");
import Usuario = require("../../models/usuario");
import DayOff = require("../../models/dayOff");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Evento.listar(
		parseInt(req.query["id_departamento"] as string),
		parseInt(req.query["id_sala"] as string),
		parseInt(req.query["ano"] as string),
		parseInt(req.query["mes"] as string)
	));
}));

router.get("/listarOcorrenciasEDaysOff", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		mes = parseInt(req.query["mes"] as string);

	if (!ano || !mes || ano < 0 || mes < 1 || mes > 12) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json({
		ocorrencias: await Evento.listarOcorrencias(
			parseInt(req.query["id_departamento"] as string),
			parseInt(req.query["id_sala"] as string),
			ano,
			mes),

		daysOff: await DayOff.listar(ano, mes < 7 ? 1 : 2)
	});
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id_evento = parseInt(req.query["id_evento"] as string);
	res.json(isNaN(id_evento) ? null : await Evento.obter(id_evento));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let p = req.body as Evento;
	jsonRes(res, 400, p ? await Evento.criar(p) : "Dados inválidos");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let e = req.body as Evento;
	if (e)
		e.id_evento = parseInt(req.body.id_evento);
	jsonRes(res, 400, (e && !isNaN(e.id_evento)) ? await Evento.alterar(e) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id_evento = parseInt(req.query["id_evento"] as string);
	jsonRes(res, 400, isNaN(id_evento) ? "Dados inválidos" : await Evento.excluir(id_evento));
}));


export = router;
