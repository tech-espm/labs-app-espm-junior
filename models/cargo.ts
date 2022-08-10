import Sql = require("../infra/sql");

export = class Cargo {
	public idcargo: number;
	public nome: string;

	private static validar(c: Cargo): string {
		if (!c)
			return "Dados inválidos";

		c.nome = (c.nome || "").normalize().trim();
		if (c.nome.length < 3 || c.nome.length > 50)
			return "Nome do cargo inválido";

		return null; 
	}

	public static async listar(): Promise<Cargo[]> {
		let lista: Cargo[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idcargo, nome from cargo order by nome asc")) as Cargo[];
		});

		return lista || [];
	}

	public static async obter(idcargo: number): Promise<Cargo> {
		let lista: Cargo[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idcargo, nome from cargo where idcargo = ?", [idcargo])) as Cargo[];
		});

		return (lista && lista[0]) || null;
	}

	public static async criar(c: Cargo): Promise<string> {
		let res: string;
		if ((res = Cargo.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into cargo (nome) values (?)", [c.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O cargo ${c.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(c: Cargo): Promise<string> {
		let res: string;
		if ((res = Cargo.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update cargo set nome = ? where idcargo = ?", [c.nome, c.idcargo]);
				if (!sql.linhasAfetadas)
					res = "Cargo não encontrado";
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O Cargo ${c.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(idcargo: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("delete from cargo where idcargo = ?", [idcargo]);
				if (!sql.linhasAfetadas)
					res = "Cargo não encontrado";
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_ROW_IS_REFERENCED":
						case "ER_ROW_IS_REFERENCED_2":
							res = "O cargo não pode ser excluído porque pertence a um ou mais eventos ou usuários";
							return;
					}
				}
				throw e;
			}
		});

		return res;
	}
};
