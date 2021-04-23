import express = require("express");
import Sql = require("../infra/sql");
import converterDataISO = require("../utils/converterDataISO");

export = class Evento {

	public idevento: number;
	public login: string;
	public nome: string;
	public idperfil: number;
	public versao: number;
	public senha: string;
	public idcargo: number;
	public idcurso: number;
	public semestre: number;
	public endereco: string;
	public telefone: string;
	public nascimento: string;
	public criacao: string;
	public dayoff: number;

	private static validar(e: Evento): string {
		if (!e)
			return "Dados inválidos";

		e.nome = (e.nome || "").normalize().trim().toUpperCase();
		if (e.nome.length < 3 || e.nome.length > 100)
			return "Nome inválido";

		e.nascimento = converterDataISO(e.nascimento);
		if (!e.nascimento)
			return "Nascimento inválido";
		// @@@ validar os campos
		// idcargo: number;
		// idcurso: number;
		// semestre: number;
		// endereco: string;
		// telefone: string;
		// nascimento: string;

		return null;
	}

	public static async listar(): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.idevento, u.login, u.nome, u.versao, p.nome perfil, u.idcargo, c.nome cargo, u.idcurso, s.nome curso, u.semestre, u.telefone, date_format(u.nascimento, '%d/%m/%Y') nascimento, date_format(u.criacao, '%d/%m/%Y') criacao from usuario u inner join perfil p on p.idperfil = u.idperfil inner join cargo c on c.idcargo = u.idcargo inner join curso s on s.idcurso = u.idcurso order by u.login asc") as Evento[];
		});

		return (lista || []);
	}

	public static async obter(idevento: number): Promise<Evento> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select idevento, login, nome, idperfil, idcargo, idcurso, semestre, endereco, telefone, date_format(nascimento, '%Y-%m-%d') nascimento, date_format(criacao, '%d/%m/%Y') criacao from usuario where idevento = ?", [idevento]) as Evento[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(u: Evento): Promise<string> {
		let res: string;
		let dayoff = 3;
		if ((res = Evento.validar(u)))
			return res;

		u.login = (u.login || "").normalize().trim().toUpperCase();
		if (u.login.length < 3 || u.login.length > 100)
			return "Login inválido";

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into usuario (login, nome, idperfil, versao, senha, idcargo, idcurso, semestre, endereco, telefone, nascimento, dayoff, criacao ) values (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, now())", [u.login, u.nome, u.idperfil, "", u.idcargo, u.idcurso, u.semestre, u.endereco, u.telefone, u.nascimento, dayoff]);
				u.idevento = await sql.scalar("select last_insert_id()") as number;
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

	public static async alterar(u: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(u)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set nome = ?, idperfil = ?, idcargo = ?, idcurso = ?, semestre = ?, endereco = ?, telefone = ?, nascimento = ? where idevento = ?", [u.nome, u.idperfil, u.idcargo, u.idcurso, u.semestre, u.endereco, u.telefone, u.nascimento, u.idevento]);
			res = sql.linhasAfetadas.toString();

			// @@@ Ficha médica...
		});

		return res;
	}

	public static async excluir(idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();
			await sql.query("delete from usuario where idevento = ?", [idevento]);
			res = sql.linhasAfetadas.toString();
			await sql.commit();
		});

		return res;
	}
}
