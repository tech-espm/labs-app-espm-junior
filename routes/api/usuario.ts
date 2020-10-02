import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.post("/alterarPerfil", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	jsonRes(res, 400, await u.alterarPerfil(res, req.body.nome as string, req.body.senhaAtual as string, req.body.novaSenha as string));
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	res.json(await Usuario.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idusuario = parseInt(req.query["idusuario"] as string);
	res.json(isNaN(idusuario) ? null : await Usuario.obter(idusuario));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	u = req.body as Usuario;
	if (u)
		u.idperfil = parseInt(req.body.idperfil);
	jsonRes(res, 400, u ? await Usuario.criar(u) : "Dados inválidos");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idusuario = u.idusuario;
	u = req.body as Usuario;
	if (u) {
		u.idusuario = parseInt(req.body.idusuario);
		u.idperfil = parseInt(req.body.idperfil);
	}
	jsonRes(res, 400, (u && !isNaN(u.idusuario)) ? (idusuario === u.idusuario ? "Um usuário não pode alterar a si próprio" : await Usuario.alterar(u)) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idusuario = parseInt(req.query["idusuario"] as string);
	jsonRes(res, 400, isNaN(idusuario) ? "Dados inválidos" : (idusuario === u.idusuario ? "Um usuário não pode excluir a si próprio" : await Usuario.excluir(idusuario)));
}));

router.get("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idusuario = parseInt(req.query["idusuario"] as string);
	jsonRes(res, 400, isNaN(idusuario) ? "Dados inválidos" : (idusuario === u.idusuario ? "Um usuário não pode redefinir sua própria senha" : await Usuario.redefinirSenha(idusuario)));
}));

export = router;
