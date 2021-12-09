import express = require("express");
import wrap = require("../../infra/wrap");
import Ponto = require("../../models/ponto");
import Usuario = require("../../models/usuario");
import jsonRes = require("../../utils/jsonRes");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!

router.get("/listarPonto", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res, true);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		mes = parseInt(req.query["mes"] as string),
		idusuario = parseInt(req.query["idusuario"] as string),
		id_departamento = parseInt(req.query["id_departamento"] as string);

	if (ano > 0 && mes >= 1 && mes <= 12 && !isNaN(idusuario) && !isNaN(id_departamento))
		res.json(await Ponto.listar(ano, mes, idusuario, id_departamento));
	else
		res.status(400).json("Dados inválidos");
}));

router.get("/marcarEntrada/:qr", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const qr = req.params["qr"] as string;

	jsonRes(res, 400, qr ? await Ponto.marcarEntrada(u.idusuario, qr, false) : "Dados inválidos");
}));

router.get("/marcarEntradaOnline", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res);
	if (!u)
		return;

	jsonRes(res, 400, await Ponto.marcarEntrada(u.idusuario, null, true));
}));

router.get("/marcarSaida/:qr", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const qr = req.params["qr"] as string;

	jsonRes(res, 400, qr ? await Ponto.marcarSaida(u.idusuario, qr, false) : "Dados inválidos");
}));

router.get("/marcarSaidaOnline", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res);
	if (!u)
		return;

	jsonRes(res, 400, await Ponto.marcarSaida(u.idusuario, null, true));
}));

router.post("/gerarTokenQR", wrap(async (req: express.Request, res: express.Response) => {
	const login = req.body.login as string,
		senhaqr = req.body.senhaqr as string;

	if (!await Usuario.conferirSenhaAdmin(login, senhaqr)) {
		res.status(403).json("Não permitido");
	} else {
		res.json(await Usuario.gerarTokenQR());
	}
}));

router.get("/gerarProximoQR", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Usuario.gerarProximoQR(req.query["token"] as string));
}));

export = router;
