﻿import { randomBytes } from "crypto";
import express = require("express");
// https://www.npmjs.com/package/lru-cache
import lru = require("lru-cache");
import Sql = require("../infra/sql");
import GeradorHash = require("../utils/geradorHash");
import appsettings = require("../appsettings");
import intToHex = require("../utils/intToHex");
import Upload = require("../infra/upload");
import FS = require("../infra/fs");
import JSONRequest = require("../infra/jsonRequest");
import emailValido = require("../utils/emailValido");
import DataUtil = require("../utils/dataUtil");
import Ciclo = require("./ciclo");

export = class Usuario {

	private static readonly IdAdmin = 1;
	private static readonly IdPerfilAdmin = 1;

	public static readonly CaminhoRelativoPerfil = "public/imagens/perfil/";

	public idusuario: number;
	public login: string;
	public nome: string;
	public idperfil: number;
	public idciclo: number;
	public versao: number;
	public idcargo: number;
	public idcurso: number;
	public id_departamento: number;
	public semestre: number;
	public daysoff: number;
	public endereco: string;
	public telefone: string;
	public nascimento: string;
	public criacao: string;

	// Utilizados apenas através do cookie
	public admin: boolean;

	// Utilizados apenas a partir das telas (fica em outra tabela)
	public nomeciclo?: string;
	public terminarcicloatual?: number;

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
				let rows = await sql.query("select idusuario, login, nome, idperfil, id_departamento, versao, token from usuario where idusuario = ?", [idusuario]);
				let row: any;

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
				u.id_departamento = row.id_departamento as number;
				u.versao = row.versao as number;
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
			await sql.query("update config set token = ?", [token]);
		});

		return token;
	}

	public static async gerarProximoQR(token: string): Promise<string> {
		let qr: string = null;

		await Sql.conectar(async (sql) => {
			const tokenAtual = await sql.scalar("select token from config") as string;
			if (token && token === tokenAtual) {
				qr = randomBytes(8).toString("hex").toLowerCase();
				await sql.query("update config set qr2 = qr1, qr1 = ?", [qr]);
			}
		});

		return qr;
	}

	public static async efetuarLogin(token: string, res: express.Response): Promise<[string, Usuario]> {
		let r: string = null;
		let u: Usuario = null;

		try {
			const resposta = await JSONRequest.get(appsettings.ssoToken + encodeURIComponent(token));
			if (!resposta.sucesso || !resposta.resultado || !resposta.resultado.dados)
				return [resposta.erro || (resposta.resultado && resposta.resultado.toString()) || "Erro de comunicação de rede", null];
			
			const json = resposta.resultado;
			if (json.erro)
				return [json.erro, null];

			await Sql.conectar(async (sql: Sql) => {

				json.dados.emailAcademico = (json.dados.emailAcademico || "").trim().toLowerCase();

				let rows = await sql.query("select idusuario, nome, idperfil, id_departamento, versao from usuario where login = ?", [json.dados.emailAcademico]);
				let row: any;
				let ok: boolean;
	
				if (!rows || !rows.length || !(row = rows[0])) {
					r = "Usuário " + json.dados.emailAcademico + " não está cadastrado. Por favor, entre em contato com o administrador do sistema.";
					return;
				}
	
				let [token, cookieStr] = Usuario.gerarTokenCookie(row.idusuario);
	
				await sql.query("update usuario set token = ? where idusuario = ?", [token, row.idusuario]);
	
				u = new Usuario();
				u.idusuario = row.idusuario;
				u.login = json.dados.emailAcademico;
				u.nome = row.nome as string;
				u.idperfil = row.idperfil as number;
				u.id_departamento = row.id_departamento as number;
				u.versao = row.versao as number;
				u.admin = (u.idperfil === Usuario.IdPerfilAdmin);
	
				res.cookie(appsettings.cookie, cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: appsettings.cookieSecure });
			});
		} catch (ex) {
			return [ex.message || ex.toString(), null];
		}

		return [r, u];
	}

	public static async conferirSenhaAdmin(login: string, senhaqr: string): Promise<boolean> {
		if (!login || !senhaqr)
			return false;

		let ok = false;

		await Sql.conectar(async (sql: Sql) => {
			login = login.normalize().trim().toLowerCase();

			let rows = await sql.query("select idperfil, senhaqr from usuario where login = ?", [login]);
			let row: any;

			if (!rows || !rows.length || !(row = rows[0]) || !row.senhaqr || !await GeradorHash.validarSenha(senhaqr.normalize(), row.senhaqr)) {
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

	public async alterarPerfil(res: express.Response, nome: string, senhaqr: string, imagemPerfil: string): Promise<string> {
		nome = (nome || "").normalize().trim();
		if (nome.length < 3 || nome.length > 100)
			return "Nome inválido";

		if (senhaqr)
			senhaqr = senhaqr.normalize();

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set nome = ? where idusuario = ?", [nome, this.idusuario]);

			if (senhaqr)
				await sql.query("update usuario set senhaqr = ? where idusuario = ?", [await GeradorHash.criarHash(senhaqr), this.idusuario]);

			this.nome = nome;

			if (imagemPerfil) {
				if (!imagemPerfil.startsWith("data:image/jpeg;base64,") || imagemPerfil.length === 23) {
					r = "Imagem de perfil inválida";
					return;
				}

				if (imagemPerfil.length > (23 + (256 * 1024 * 4 / 3))) {
					r = "Imagem de perfil muito grande";
					return;
				}

				try {
					await Upload.gravarArquivo({
						buffer: Buffer.from(imagemPerfil.substr(23), "base64")
					}, Usuario.CaminhoRelativoPerfil, this.idusuario + ".jpg");

					this.versao++;

					await sql.query("update usuario set versao = ? where idusuario = ?", [this.versao, this.idusuario]);
				} catch (ex) {
					r = "Erro ao gravar a imagem de perfil";
					return;
				}
			}
		});

		return r;
	}

	private static validar(u: Usuario): string {
		if (!u)
			return "Dados inválidos";

		u.idusuario = parseInt(u.idusuario as any);

		u.login = (u.login || "").normalize().trim().toLowerCase();
		if (u.login.length < 3 || u.login.length > 100 || !emailValido(u.login))
			return "Login inválido";

		if (!u.login.endsWith("@espm.br") && !u.login.endsWith("@acad.espm.br"))
			return "Login deve terminar com @espm.br ou @acad.espm.br";

		u.nome = (u.nome || "").normalize().trim();
		if (u.nome.length < 2 || u.nome.length > 100)
			return "Nome inválido";

		u.idperfil = parseInt(u.idperfil as any);
		if (isNaN(u.idperfil))
			return "Perfil inválido";

		u.idcargo = parseInt(u.idcargo as any);
		if (isNaN(u.idcargo))
			return "Cargo inválido";

		u.idcurso = parseInt(u.idcurso as any);
		if (isNaN(u.idcurso))
			return "Curso inválido";

		u.id_departamento = parseInt(u.id_departamento as any);
		if (isNaN(u.id_departamento))
			return "Departamento inválido";

		u.semestre = parseInt(u.semestre as any);
		if (isNaN(u.semestre))
			return "Semestre inválido";

		u.daysoff = parseInt(u.daysoff as any);
		if (isNaN(u.daysoff) || u.daysoff < 0 || u.daysoff > 99)
			return "Quantidade de days off inválida";

		u.endereco = (u.endereco || "").normalize().trim();
		if (u.endereco.length < 3 || u.endereco.length > 100)
			return "Endereço inválido";

		u.telefone = (u.telefone || "").normalize().trim();
		if (u.telefone.length < 3 || u.telefone.length > 20)
			return "Telefone inválido";

		if (!(u.nascimento = DataUtil.converterDataISO(u.nascimento)))
			return "Data de nascimento inválida";

		u.nomeciclo = (u.nomeciclo || "").normalize().trim();
		if (u.nomeciclo.length < 2 || u.nomeciclo.length > 50)
			return "Ciclo inválido";

		u.terminarcicloatual = (u.terminarcicloatual == 1 ? 1 : 0);

		return null;
	}

	public static async listarDropDown(): Promise<Usuario[]> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select idusuario, nome from usuario order by nome asc") as Usuario[];
		});

		return (lista || []);
	}

	public static async listar(): Promise<Usuario[]> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.idusuario, u.login, u.nome, u.versao, p.nome perfil, ci.nome nomeciclo, date_format(ci.inicio, '%d/%m/%Y') iniciociclo, u.idcargo, c.nome cargo, u.idcurso, s.nome curso, u.id_departamento, d.desc_departamento, u.semestre, u.daysoff, u.telefone, date_format(u.nascimento, '%d/%m/%Y') nascimento, date_format(u.criacao, '%d/%m/%Y') criacao from usuario u inner join perfil p on p.idperfil = u.idperfil inner join cargo c on c.idcargo = u.idcargo inner join curso s on s.idcurso = u.idcurso inner join departamento d on d.id_departamento = u.id_departamento left join ciclo ci on ci.idciclo = u.idciclo order by u.login asc") as Usuario[];
		});

		return (lista || []);
	}

	public static async obter(idusuario: number): Promise<Usuario> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.idusuario, u.login, u.nome, u.idperfil, ci.nome nomeciclo, date_format(ci.inicio, '%d/%m/%Y') iniciociclo, u.idcargo, u.idcurso, u.id_departamento, u.semestre, u.daysoff, u.endereco, u.telefone, date_format(u.nascimento, '%Y-%m-%d') nascimento, date_format(u.criacao, '%d/%m/%Y') criacao from usuario u left join ciclo ci on ci.idciclo = u.idciclo where u.idusuario = ?", [idusuario]) as Usuario[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(u: Usuario): Promise<string> {
		let res: string;

		if ((res = Usuario.validar(u)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				const agora = DataUtil.horarioDeBrasiliaISOComHorario();

				await sql.beginTransaction();

				await sql.query("insert into usuario (login, nome, idperfil, idciclo, versao, idcargo, idcurso, id_departamento, semestre, daysoff, endereco, telefone, nascimento, criacao) values (?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [u.login, u.nome, u.idperfil, u.idcargo, u.idcurso, u.id_departamento, u.semestre, u.daysoff, u.endereco, u.telefone, u.nascimento, agora]);
				u.idusuario = await sql.scalar("select last_insert_id()") as number;

				u.idciclo = await Ciclo.mudarAtual(u.idusuario, 0, u.nomeciclo, sql);

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

		return Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();

			await sql.query("update usuario set nome = ?, idperfil = ?, idcargo = ?, idcurso = ?, id_departamento = ?, semestre = ?, daysoff = ?, endereco = ?, telefone = ?, nascimento = ? where idusuario = ?", [u.nome, u.idperfil, u.idcargo, u.idcurso, u.id_departamento, u.semestre, u.daysoff, u.endereco, u.telefone, u.nascimento, u.idusuario]);
			if (!sql.linhasAfetadas)
				return "0";

			const cicloAtual = await Ciclo.obterAtual(u.idusuario, sql);

			if (!cicloAtual || u.terminarcicloatual)
				await Ciclo.mudarAtual(u.idusuario, (cicloAtual && cicloAtual.idciclo) || 0, u.nomeciclo, sql);
			else
				await Ciclo.alterarNome(u.idusuario, cicloAtual.idciclo, u.nomeciclo, sql);

			// @@@ Ficha médica...

			await sql.commit();

			return "1";
		});
	}

	public static async excluir(idusuario: number): Promise<string> {
		if (idusuario === Usuario.IdAdmin)
			return "Não é possível excluir o usuário administrador principal";

		return Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();
			await sql.query("delete from usuario where idusuario = ?", [idusuario]);

			if (!sql.linhasAfetadas)
				return "0";

			if (sql.linhasAfetadas) {
				const caminho = Usuario.CaminhoRelativoPerfil + idusuario + ".jpg";
				if (await FS.existeArquivo(caminho))
					await FS.excluirArquivo(caminho);
			}

			await sql.commit();

			return "1";
		});
	}
}
