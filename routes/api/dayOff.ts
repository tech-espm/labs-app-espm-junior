import express = require("express");
import wrap = require("../../infra/wrap");
import DayOff = require("../../models/dayOff");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		ciclo = parseInt(req.query["ciclo"] as string);

	if (!ano || !ciclo || ano < 0 || ciclo < 1 || ciclo > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listarDaysOff(ano, ciclo, u.idusuario));
}));

router.get("/listarHoras", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		ciclo = parseInt(req.query["ciclo"] as string);

	if (!ano || !ciclo || ano < 0 || ciclo < 1 || ciclo > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listarHoras(ano, ciclo, u.idusuario));
}));

router.post("/sincronizar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		ciclo = parseInt(req.query["ciclo"] as string);

	if (!ano || !ciclo || ano < 0 || ciclo < 1 || ciclo > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	const erro = await DayOff.sincronizarDaysOff(ano, ciclo, u.idusuario, req.body.daysOff);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

router.post("/sincronizarHoras", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const ano = parseInt(req.query["ano"] as string),
		ciclo = parseInt(req.query["ciclo"] as string);

	if (!ano || !ciclo || ano < 0 || ciclo < 1 || ciclo > 2) {
		res.status(400).json("Dados inválidos");
		return;
	}

	const erro = await DayOff.sincronizarHoras(ano, ciclo, u.idusuario, req.body.horasPessoais);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

router.post("/atualizarCicloAtual", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;

	const erro = await DayOff.atualizarCicloAtual(req.body);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

export = router;
