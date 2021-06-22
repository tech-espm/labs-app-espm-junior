import express = require("express");
import wrap = require("../../infra/wrap");
import Ponto = require("../../models/ponto");
import Usuario = require("../../models/usuario");
import jsonRes = require("../../utils/jsonRes");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!

router.get("/marcarEntrada/:qr", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let qr = req.params["qr"] as string;
	jsonRes(res, 400, (u && qr) ? await Ponto.marcarEntrada(u.idusuario, qr, false) : "Dados inválidos");
}));

router.get("/marcarEntradaOnline", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	jsonRes(res, 400, u ? await Ponto.marcarEntrada(u.idusuario, null, true) : "Dados inválidos");
}));

router.get("/marcarSaida/:qr", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let qr = req.params["qr"] as string;
	jsonRes(res, 400, (u && qr) ? await Ponto.marcarSaida(u.idusuario, qr, false) : "Dados inválidos");
}));

router.get("/marcarSaidaOnline", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	jsonRes(res, 400, u ? await Ponto.marcarSaida(u.idusuario, null, true) : "Dados inválidos");
}));

router.post("/gerarTokenQR", wrap(async (req: express.Request, res: express.Response) => {
	const login = req.body.login as string,
		senha = req.body.senha as string;

	if (!await Usuario.conferirSenhaAdmin(login, senha)) {
		res.status(403).json("Não permitido");
	} else {
		res.json(await Usuario.gerarTokenQR());
	}
}));

router.get("/gerarProximoQR", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Usuario.gerarProximoQR(req.query["token"] as string));
}));

export = router;
