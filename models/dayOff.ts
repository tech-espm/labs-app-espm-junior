import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");

export = class DayOff {
	public static readonly QuantidadeMaxima = 3;

	public iddayoff: number;
	public idusuario: number;
	public ano: number;
	public semestre: number;
	public data: string;
	public criacao: string;

	public static async listar(ano?: number, semestre?: number, idusuario?: number): Promise<DayOff[]> {
		const regexp = /[\/\-\:\s]/g,
			hoje = parseInt(DataUtil.hojeBrasil().replace(regexp, "")),
			anoAtual = (hoje / 10000) | 0,
			mesAtual = ((hoje / 100) | 0) % 100,
			semestreAtual = (mesAtual < 7 ? 1 : 2);

		if (!ano)
			ano = anoAtual;

		if (!semestre)
			semestre = semestreAtual;

		let lista: DayOff[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select d.iddayoff, d.idusuario, u.nome, date_format(d.data, '%Y-%m-%d') data from dayoff d inner join usuario u on u.idusuario = d.idusuario where d.ano = ? and d.semestre = ?" + (idusuario ? (" and d.idusuario = ? order by d.data asc") : ""), idusuario ? [ano, semestre, idusuario] : [ano, semestre]);
		});

		return lista || [];
	}

	public static async sincronizar(idusuario: number, daysOff: string[]): Promise<string> {
		if (!daysOff)
			return "Dados inválidos";

		const regexp = /[\/\-\:\s]/g,
			hoje = parseInt(DataUtil.hojeBrasil().replace(regexp, "")),
			anoAtual = (hoje / 10000) | 0,
			mesAtual = ((hoje / 100) | 0) % 100,
			semestreAtual = (mesAtual < 7 ? 1 : 2);

		for (let i = daysOff.length - 1; i >= 0; i--) {
			if (!daysOff[i])
				return "Dados inválidos";

			if (!(daysOff[i] = DataUtil.converterDataISO(daysOff[i])))
				return "Data inválida";

			const data = parseInt(daysOff[i].replace(regexp, "")),
				ano = (data / 10000) | 0,
				mes = ((data / 100) | 0) % 100,
				semestre = (mes < 7 ? 1 : 2);

			if (ano !== anoAtual)
				return "Não é permitido pedir um day off para um ano diferente do atual";

			if (semestre !== semestreAtual)
				return "Não é permitido pedir um day off para um semestre diferente do atual";
		}

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const antigos: DayOff[] = await sql.query("select iddayoff, date_format(data, '%Y-%m-%d') data from dayoff where ano = ? and semestre = ? and idusuario = ?", [anoAtual, semestreAtual, idusuario]);
			const adicionar = daysOff;

			let existentes = 0;

			for (let i = antigos.length - 1; i >= 0; i--) {
				const data = antigos[i].data;

				for (let j = adicionar.length - 1; j >= 0; j--) {
					if (adicionar[j] === data) {
						existentes++;
						antigos.splice(i, 1);
						adicionar.splice(j, 1);
						break;
					}
				}
			}

			if ((existentes + adicionar.length) > DayOff.QuantidadeMaxima) {
				res = "Não é permitido pedir mais de " + DayOff.QuantidadeMaxima + " days off por semestre";
				return;
			}

			await sql.beginTransaction();

			for (let i = antigos.length - 1; i >= 0; i--)
				await sql.query("delete from dayoff where iddayoff = ?", [antigos[i].iddayoff]);

			for (let i = adicionar.length - 1; i >= 0; i--)
				await sql.query("insert into dayoff (idusuario, ano, semestre, data, criacao) values (?, ?, ?, ?, now())", [idusuario, anoAtual, semestreAtual, adicionar[i]]);

			await sql.commit();
		});

		return res;
	}
};
