import express = require("express");
import wrap = require("express-async-error-wrapper");
import Ponto = require("../../models/ponto");
import Usuario = require("../../models/usuario");
import jsonRes = require("../../utils/jsonRes");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!

router.get("/baterPonto", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["idusuario"] as string);
	jsonRes(res, 400, u ? await Ponto.baterEntrada(id) : "Dados inválidos");
}));

export = router;
