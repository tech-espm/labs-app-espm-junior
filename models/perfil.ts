import Sql = require("../infra/sql");

export = class Perfil {
	public idperfil: number;
	public nome: string;

	private static validar(p: Perfil): string {
		if (!p)
			return "Dados inválidos";

		p.nome = (p.nome || "").normalize().trim();
		if (p.nome.length < 3 || p.nome.length > 50)
			return "Nome inválido";

		return null;
	}

	public static async listar(): Promise<Perfil[]> {
		let lista: Perfil[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idperfil, nome from perfil order by nome asc")) as Perfil[];
		});

		return lista || [];
	}

	public static async obter(idperfil: number): Promise<Perfil> {
		let lista: Perfil[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idperfil, nome from perfil where idperfil = ?", [idperfil])) as Perfil[];
		});

		return (lista && lista[0]) || null;
	}

	public static async criar(p: Perfil): Promise<string> {
		let res: string;
		if ((res = Perfil.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into perfil (nome) values (?)", [p.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O perfil ${p.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(p: Perfil): Promise<string> {
		let res: string;
		if ((res = Perfil.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update perfil set nome = ? where idperfil = ?", [p.nome, p.idperfil]);
				if (!sql.linhasAfetadas)
					res = "Perfil não encontrado";
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O perfil ${p.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(idperfil: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from perfil where idperfil = ?", [idperfil]);
			if (!sql.linhasAfetadas)
				res = "Perfil não encontrado";
		});

		return res;
	}
};
