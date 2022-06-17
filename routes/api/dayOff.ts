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

	const idciclo = parseInt(req.query["idciclo"] as string);

	if (!idciclo) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listarDaysOff(u.idusuario, idciclo));
}));

router.get("/listarHoras", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const idciclo = parseInt(req.query["idciclo"] as string);

	if (!idciclo) {
		res.status(400).json("Dados inválidos");
		return;
	}

	res.json(await DayOff.listarHoras(u.idusuario, idciclo));
}));

router.post("/sincronizar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const idciclo = parseInt(req.query["idciclo"] as string);

	if (!idciclo) {
		res.status(400).json("Dados inválidos");
		return;
	}

	const erro = await DayOff.sincronizarDaysOff(u.idusuario, idciclo, req.body.daysOff);

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

	const idciclo = parseInt(req.query["idciclo"] as string);

	if (!idciclo) {
		res.status(400).json("Dados inválidos");
		return;
	}

	const erro = await DayOff.sincronizarHoras(u.idusuario, idciclo, req.body.horasPessoaisDatas, req.body.horasPessoaisMinutos);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

export = router;
