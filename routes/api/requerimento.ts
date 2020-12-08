import express = require("express");
import wrap = require("express-async-error-wrapper");
import Ponto = require("../../models/ponto");
import Usuario = require("../../models/usuario");
import jsonRes = require("../../utils/jsonRes");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!

router.get("/baterEntrada/:qr", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let qr = req.params["qr"] as string;
	jsonRes(res, 400, (u && qr) ? await Ponto.baterEntrada(u.idusuario, qr) : "Dados inválidos");
}));

router.get("/baterSaida/:qr", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let qr = req.params["qr"] as string;
	jsonRes(res, 400, (u && qr) ? await Ponto.baterSaida(u.idusuario, qr) : "Dados inválidos");
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

 router.put("/dayoff", wrap(async (req: express.Request, res: express.Response) => {
 		let u = await Usuario.cookie(req, res);
 	if (!u)
		 return;
	res.json(await Usuario.pedirDayoff(u));
 }));
export = router;
