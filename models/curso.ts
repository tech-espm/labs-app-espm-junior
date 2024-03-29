import Sql = require("../infra/sql");

export = class Curso {
	public idcurso: number;
	public nome: string;

	private static validar(c: Curso): string {
		if (!c)
			return "Dados inválidos";

		c.nome = (c.nome || "").normalize().trim();
		if (c.nome.length < 2 || c.nome.length > 50)
			return "Nome do curso inválido";

		return null; 
	}

	public static async listar(): Promise<Curso[]> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idcurso, nome from curso order by nome asc")) as Curso[];
		});

		return lista || [];
	}

	public static async obter(idcurso: number): Promise<Curso> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select idcurso, nome from curso where idcurso = ?", [idcurso])) as Curso[];
		});

		return (lista && lista[0]) || null;
	}

	public static async criar(c: Curso): Promise<string> {
		let res: string;
		if ((res = Curso.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into curso (nome) values (?)", [c.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O curso ${c.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(c: Curso): Promise<string> {
		let res: string;
		if ((res = Curso.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update curso set nome = ? where idcurso = ?", [c.nome, c.idcurso]);
				if (!sql.linhasAfetadas)
					res = "Curso não encontrado";
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O Curso ${c.nome} já existe`;
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(idcurso: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("delete from curso where idcurso = ?", [idcurso]);
				if (!sql.linhasAfetadas)
					res = "Curso não encontrado";
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_ROW_IS_REFERENCED":
						case "ER_ROW_IS_REFERENCED_2":
							res = "O curso não pode ser excluído porque pertence a um ou mais usuários";
							return;
					}
				}
				throw e;
			}
		});

		return res;
	}
};
