import express = require("express");
import wrap = require("express-async-error-wrapper");
import Ponto = require("../../models/ponto");
import Usuario = require("../../models/usuario");
import jsonRes = require("../../utils/jsonRes");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!

router.post("/baterPonto", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["idusuario"] as string);
	jsonRes(res, 400, u ? await Ponto.baterEntrada(id) : "Dados inválidos");
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
