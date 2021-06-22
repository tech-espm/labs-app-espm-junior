import express = require("express");
import wrap = require("../../infra/wrap");
import DayOff = require("../../models/dayoff");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.post("/sincronizar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const erro = await DayOff.sincronizar(u.idusuario, req.body.daysOff);

	if (erro) {
		res.status(400).json(erro);
	} else {
		res.json(true);
	}
}));

export = router;
