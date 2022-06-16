import Sql = require("../infra/sql"); 

export = class Ciclo {
	public static readonly DuracaoMediaDias = 8 * 30;

	public idciclo: number;
	public idusuario: number;
	public nome: string;
	public inicio: string;
	public termino?: string | null;

	public static async obterIdAtual(sql: Sql, idusuario: number): Promise<number> {
		const idciclo: number = await sql.scalar("select idciclo from usuario where idusuario = ?", [idusuario]);
		return (idciclo || 0);
	}

	public static obterAtual(idusuario: number): Promise<Ciclo | null> {
		return Sql.conectar(async (sql: Sql) => {
			const idciclo = await Ciclo.obterIdAtual(sql, idusuario);
			if (!idciclo)
				return null;

			const lista: Ciclo[] = await sql.query("select idciclo, idusuario, nome, date_format(inicio, '%Y-%m-%d') inicio, date_format(termino, '%Y-%m-%d') termino from ciclo where idciclo = ?", [idciclo]);
			return (lista && lista[0]);
		});
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
