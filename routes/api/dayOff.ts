import express = require("express");
import wrap = require("../../infra/wrap");
import DayOff = require("../../models/dayoff");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		semestre = parseInt(req.query["semestre"] as string);

	if (!ano || !semestre || ano < 0 || semestre < 1 || semestre > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listar(ano, semestre, u.idusuario));
}));

router.get("/listarGeral", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		semestre = parseInt(req.query["semestre"] as string);

	if (!ano || !semestre || ano < 0 || semestre < 1 || semestre > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listar(ano, semestre));
}));

router.post("/sincronizar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		semestre = parseInt(req.query["semestre"] as string);

	if (!ano || !semestre || ano < 0 || semestre < 1 || semestre > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	const erro = await DayOff.sincronizar(ano, semestre, u.idusuario, req.body.daysOff);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

export = router;
