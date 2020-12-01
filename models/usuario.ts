import { randomBytes } from "crypto";
import express = require("express");
// https://www.npmjs.com/package/lru-cache
import lru = require("lru-cache");
import Sql = require("../infra/sql");
import GeradorHash = require("../utils/geradorHash");
import appsettings = require("../appsettings");
import intToHex = require("../utils/intToHex");

export = class Usuario {

	private static readonly IdAdmin = 1;
	private static readonly IdPerfilAdmin = 1;

	public idusuario: number;
	public login: string;
	public nome: string;
	public idperfil: number;
	public senha: string;
	public idcargo: number;
	public idcurso: number;
	public semestre: number;
	public endereco: string;
	public telefone: string;
	public nascimento: string;
	public criacao: string;

	// Utilizados apenas através do cookie
	public admin: boolean;

	// Não estamos utilizando Usuario.cookie como middleware, porque existem muitas requests
	// que não precisam validar o usuário logado, e agora, é assíncrono...
	// http://expressjs.com/pt-br/guide/writing-middleware.html
	//public static cookie(req: express.Request, res: express.Response, next: Function): void {
	public static async cookie(req: express.Request, res: express.Response = null, admin: boolean = false): Promise<Usuario> {
		let cookieStr = req.cookies[appsettings.cookie] as string;
		if (!cookieStr || cookieStr.length !== 48) {
			if (res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return null;
		} else {
			let idusuario = parseInt(cookieStr.substr(0, 8), 16) ^ appsettings.usuarioHashId;
			let usuario: Usuario = null;

			await Sql.conectar(async (sql: Sql) => {
				let rows = await sql.query("select idusuario, login, nome, idperfil, token from usuario where idusuario = ?", [idusuario]);
				let row;

				if (!rows || !rows.length || !(row = rows[0]))
					return;

				let token = cookieStr.substring(16);

				if (!row.token || token !== (row.token as string))
					return;

				let u = new Usuario();
				u.idusuario = idusuario;
				u.login = row.login as string;
				u.nome = row.nome as string;
				u.idperfil = row.idperfil as number;
				u.admin = (u.idperfil === Usuario.IdPerfilAdmin);

				usuario = u;
			});

			if (admin && usuario && usuario.idperfil !== Usuario.IdPerfilAdmin)
				usuario = null;
			if (!usuario && res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return usuario;
		}
	}

	private static gerarTokenCookie(idusuario: number): [string, string] {
		let idStr = intToHex(idusuario ^ appsettings.usuarioHashId);
		let idExtra = intToHex(0);
		let token = randomBytes(16).toString("hex");
		let cookieStr = idStr + idExtra + token;
		return [token, cookieStr];
	}

	public static async gerarTokenQR(): Promise<string> {
		let token = randomBytes(32).toString("hex");

		await Sql.conectar(async (sql) => {
			await sql.query("update tokenqr set token = ?", [token]);
		});

		return token;
	}

	public static async gerarProximoQR(token: string): Promise<string> {
		let qr: string = null;

		await Sql.conectar(async (sql) => {
			const tokenAtual = await sql.scalar("select token from tokenqr") as string;
			if (token && token === tokenAtual) {
				qr = randomBytes(8).toString("hex").toLowerCase();
				await sql.query("update tokenqr set qr2 = qr1, qr1 = ?", [qr]);
			}
		});

		return qr;
	}

	public static async efetuarLogin(login: string, senha: string, res: express.Response): Promise<[string, Usuario]> {
		if (!login || !senha)
			return ["Usuário ou senha inválidos", null];

		let r: string = null;
		let u: Usuario = null;

		await Sql.conectar(async (sql: Sql) => {
			login = login.normalize().trim().toUpperCase();

			let rows = await sql.query("select idusuario, nome, idperfil, senha from usuario where login = ?", [login]);
			let row;
			let ok: boolean;

			if (!rows || !rows.length || !(row = rows[0]) || !(ok = await GeradorHash.validarSenha(senha.normalize(), row.senha))) {
				r = "Usuário ou senha inválidos";
				return;
			}

			let [token, cookieStr] = Usuario.gerarTokenCookie(row.idusuario);

			await sql.query("update usuario set token = ? where idusuario = ?", [token, row.idusuario]);

			u = new Usuario();
			u.idusuario = row.idusuario;
			u.login = login;
			u.nome = row.nome as string;
			u.idperfil = row.idperfil as number;
			u.admin = (u.idperfil === Usuario.IdPerfilAdmin);

			res.cookie(appsettings.cookie, cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: appsettings.cookieSecure });
		});

		return [r, u];
	}

	public static async conferirSenhaAdmin(login: string, senha: string): Promise<boolean> {
		if (!login || !senha)
			return false;

		let ok = false;

		await Sql.conectar(async (sql: Sql) => {
			login = login.normalize().trim().toUpperCase();

			let rows = await sql.query("select idperfil, senha from usuario where login = ?", [login]);
			let row: any;

			if (!rows || !rows.length || !(row = rows[0]) || !await GeradorHash.validarSenha(senha.normalize(), row.senha)) {
				return;
			}

			ok = (row.idperfil === Usuario.IdPerfilAdmin);
		});

		return ok;
	}

	public async efetuarLogout(res: express.Response): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set token = null where idusuario = ?", [this.idusuario]);

			res.cookie(appsettings.cookie, "", { expires: new Date(0), httpOnly: true, path: "/", secure: appsettings.cookieSecure });
		});
	}

	public async alterarPerfil(res: express.Response, nome: string, senhaAtual: string, novaSenha: string): Promise<string> {
		nome = (nome || "").normalize().trim().toUpperCase();
		if (nome.length < 3 || nome.length > 100)
			return "Nome inválido";

		if (!!senhaAtual !== !!novaSenha || (novaSenha && novaSenha.length > 40))
			return "Senha inválida";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (senhaAtual) {
				let hash = await sql.scalar("select senha from usuario where idusuario = ?", [this.idusuario]) as string;
				if (!await GeradorHash.validarSenha(senhaAtual.normalize(), hash)) {
					r = "Senha atual não confere";
					return;
				}

				hash = await GeradorHash.criarHash(novaSenha.normalize());

				let [token, cookieStr] = Usuario.gerarTokenCookie(this.idusuario);

				await sql.query("update usuario set nome = ?, senha = ?, token = ? where idusuario = ?", [nome, hash, token, this.idusuario]);

				this.nome = nome;

				res.cookie(appsettings.cookie, cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: appsettings.cookieSecure });
			} else {
				await sql.query("update usuario set nome = ? where idusuario = ?", [nome, this.idusuario]);

				this.nome = nome;
			}
		});

		return r;
	}

	private static validar(u: Usuario): string {
		if (!u)
			return "Dados inválidos";

		u.nome = (u.nome || "").normalize().trim().toUpperCase();
		if (u.nome.length < 3 || u.nome.length > 100)
			return "Nome inválido";

		// @@@ validar os campos
		// idcargo: number;
		// idcurso: number;
		// semestre: number;
		// endereco: string;
		// telefone: string;
		// nascimento: string;

		return null;
	}

	public static async listar(): Promise<Usuario[]> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.idusuario, u.login, u.nome, p.nome perfil, u.idcargo, c.nome cargo, u.idcurso, s.nome curso, u.semestre, u.telefone, date_format(u.nascimento, '%d/%m/%Y') nascimento, date_format(u.criacao, '%d/%m/%Y') criacao from usuario u inner join perfil p on p.idperfil = u.idperfil inner join cargo c on c.idcargo = u.idcargo inner join curso s on s.idcurso = u.idcurso order by u.login asc") as Usuario[];
		});

		return (lista || []);
	}

	public static async obter(idusuario: number): Promise<Usuario> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select idusuario, login, nome, idperfil, idcargo, idcurso, semestre, endereco, telefone, date_format(nascimento, '%d/%m/%Y') nascimento, date_format(criacao, '%d/%m/%Y') criacao from usuario where idusuario = ?", [idusuario]) as Usuario[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(u: Usuario): Promise<string> {
		let res: string;
		if ((res = Usuario.validar(u)))
			return res;

		u.login = (u.login || "").normalize().trim().toUpperCase();
		if (u.login.length < 3 || u.login.length > 100)
			return "Login inválido";

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into usuario (login, nome, idperfil, senha, idcargo, idcurso, semestre, endereco, telefone, nascimento, criacao) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())", [u.login, u.nome, u.idperfil, appsettings.usuarioHashSenhaPadrao, u.idcargo, u.idcurso, u.semestre, u.endereco, u.telefone, u.nascimento]);
				u.idusuario = await sql.scalar("select last_insert_id()") as number;

				// @@@ Ficha médica...
				await sql.query("insert into ficha_medica (idusuario, tipo_sanguineo, alergia, plano_saude, contato_emergencia, hospital_preferencia) VALUES (?, '', '', '', '', '')", [u.idusuario]);

				await sql.commit();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = `O login ${u.login} já está em uso`;
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Perfil não encontrado";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		return res;
	}

	public static async alterar(u: Usuario): Promise<string> {
		let res: string;
		if ((res = Usuario.validar(u)))
			return res;

		if (u.idusuario === Usuario.IdAdmin)
			return "Não é possível editar o usuário administrador principal";

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set nome = ?, idperfil = ?, idcargo = ?, idcurso = ?, semestre = ?, endereco = ?, telefone = ?, nascimento = ? where idusuario = ?", [u.nome, u.idperfil, u.idcargo, u.idcurso, u.semestre, u.endereco, u.telefone, u.nascimento, u.idusuario]);
			res = sql.linhasAfetadas.toString();

			// @@@ Ficha médica...
		});

		return res;
	}

	public static async excluir(idusuario: number): Promise<string> {
		if (idusuario === Usuario.IdAdmin)
			return "Não é possível excluir o usuário administrador principal";

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from usuario where idusuario = ?", [idusuario]);
			res = sql.linhasAfetadas.toString();
		});

		return res;
	}

	public static async redefinirSenha(idusuario: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let login = await sql.scalar("select login from usuario where idusuario = ?", [idusuario]) as string;
			if (!login) {
				res = "0";
			} else {
				await sql.query("update usuario set token = null, senha = ? where idusuario = ?", [appsettings.usuarioHashSenhaPadrao, idusuario]);
				res = sql.linhasAfetadas.toString();
			}
		});

		return res;
	}
}
