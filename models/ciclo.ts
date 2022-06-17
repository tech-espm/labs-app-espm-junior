import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");

export = class Ciclo {
	public static readonly DuracaoMediaDias = 8 * 30;

	public idciclo: number;
	public idusuario: number;
	public nome: string;
	public inicio: string;
	public termino?: string | null;

	public static async obterIdAtual(idusuario: number, sql: Sql): Promise<number> {
		const idciclo: number = await sql.scalar("select idciclo from usuario where idusuario = ?", [idusuario]);
		return (idciclo || 0);
	}

	public static async obterAtual(idusuario: number, sql?: Sql): Promise<Ciclo | null> {
		if (!sql)
			return Sql.conectar(async (sql: Sql) => {
				return await Ciclo.obterAtual(idusuario, sql);
			});

		const idciclo = await Ciclo.obterIdAtual(idusuario, sql);
		if (!idciclo)
			return null;

		const lista: Ciclo[] = await sql.query("select idciclo, idusuario, nome, date_format(inicio, '%Y-%m-%d') inicio, date_format(termino, '%Y-%m-%d') termino from ciclo where idciclo = ?", [idciclo]);
		return (lista && lista[0]);
	}

	public static async mudarAtual(idusuario: number, idciclo: number, nomeciclo: string, sql: Sql): Promise<number> {
		const hoje = DataUtil.horarioDeBrasiliaISO();

		await sql.query("update ciclo set termino = ? where idusuario = ? and idciclo = ? and termino is null", [hoje, idusuario, idciclo]);

		await sql.query("insert into ciclo (idusuario, nome, inicio) VALUES (?, ?, ?)", [idusuario, nomeciclo, hoje]);
		idciclo = await sql.scalar("select last_insert_id()");

		await sql.query("update usuario set idciclo = ? where idusuario = ?", [idciclo, idusuario]);

		return idciclo;
	}

	public static async alterarNome(idusuario: number, idciclo: number, nomeciclo: string, sql: Sql): Promise<void> {
		await sql.query("update ciclo set nome = ? where idusuario = ? and idciclo = ?", [nomeciclo, idusuario, idciclo]);
	}

	public static listar(idusuario: number): Promise<Ciclo[]> {
		return Sql.conectar(async (sql: Sql) => {
			return await sql.query("select idciclo, idusuario, nome, date_format(inicio, '%Y-%m-%d') inicio, date_format(termino, '%Y-%m-%d') termino from ciclo where idusuario = ? order by idciclo desc", [idusuario]);
		});
	}

	public static dataPertenceAoCiclo(data: string, ciclo: Ciclo): boolean {
		const d = (new Date(data)).getTime(),
			c = (new Date(ciclo.inicio)).getTime(),
			fc = c + (Ciclo.DuracaoMediaDias * 24 * 60 * 60 * 1000);
		return (c <= d && d <= fc);
	}
};
