import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");

export = class DayOff {
	private static readonly RegExp = /[\/\-\:\s]/g;

	public iddayoff: number;
	public idusuario: number;
	public ano: number;
	public semestre: number;
	public data: string;
	public criacao: string;

	public static infoAtual(): { hoje: number, anoAtual: number, mesAtual: number, semestreAtual: number } {
		const hoje = parseInt(DataUtil.hojeISO().replace(DayOff.RegExp, "")),
			anoAtual = (hoje / 10000) | 0,
			mesAtual = ((hoje / 100) | 0) % 100,
			semestreAtual = (mesAtual < 7 ? 1 : 2);

		return {
			hoje,
			anoAtual,
			mesAtual,
			semestreAtual
		};
	}

	public static async listar(ano?: number, semestre?: number, idusuario?: number, id_departamento?: number): Promise<{ nome: string, data: string, id_departamento: number, desc_departamento: string }[]> {
		if (!ano || !semestre) {
			const infoAtual = DayOff.infoAtual();

			if (!ano)
				ano = infoAtual.anoAtual;

			if (!semestre)
				semestre = infoAtual.semestreAtual;
		}

		let lista: { nome: string, data: string, id_departamento: number, desc_departamento: string }[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.nome, date_format(d.data, '%Y-%m-%d') data, u.id_departamento, dp.desc_departamento from dayoff d inner join usuario u on u.idusuario = d.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento where d.ano = ? and d.semestre = ?" + (idusuario ? (" and d.idusuario = ? order by d.data asc") : (id_departamento ? " and u.id_departamento = ?" : "")), (idusuario || id_departamento) ? [ano, semestre, idusuario || id_departamento] : [ano, semestre]);
		});

		return lista || [];
	}

	public static async sincronizar(ano: number, semestre: number, idusuario: number, daysOff: string[]): Promise<string> {
		if (!daysOff)
			daysOff = [];
		else if (!Array.isArray(daysOff))
			daysOff = [ daysOff as any ];

		const infoAtual = DayOff.infoAtual(),
			regexp = DayOff.RegExp,
			hoje = infoAtual.hoje,
			anoAtual = infoAtual.anoAtual,
			semestreAtual = infoAtual.semestreAtual;

		if (ano !== anoAtual)
			return "Não é permitido sincronizar days off de um ano diferente do atual";

		if (semestre !== semestreAtual)
			return "Não é permitido sincronizar days off de um semestre diferente do atual";

		for (let i = daysOff.length - 1; i >= 0; i--) {
			if (!daysOff[i])
				return "Day off em branco";

			if (!(daysOff[i] = DataUtil.converterDataISO(daysOff[i])))
				return "Data inválida";

			const data = parseInt(daysOff[i].replace(regexp, "")),
				anoData = (data / 10000) | 0,
				mesData = ((data / 100) | 0) % 100,
				semestreData = (mesData < 7 ? 1 : 2);

			if (anoData !== anoAtual)
				return "Não é permitido sincronizar days off de um ano diferente do atual";

			if (semestreData !== semestreAtual)
				return "Não é permitido sincronizar days off de um semestre diferente do atual";
		}

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const quantidadeMaxima = await sql.scalar("select daysoff from usuario where idusuario = ?", [idusuario]) as number;
			if (!quantidadeMaxima) {
				res = "Usuário não tem permissão para pedir days off";
				return;
			}

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

			if ((existentes + adicionar.length) > quantidadeMaxima) {
				res = "Não é permitido pedir mais de " + quantidadeMaxima + " days off por semestre";
				return;
			}

			for (let i = antigos.length - 1; i >= 0; i--) {
				if (parseInt(antigos[i].data.replace(regexp, "")) < hoje) {
					res = "Não é permitido excluir um day off de uma data passada";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (parseInt(adicionar[i].replace(regexp, "")) < hoje) {
					res = "Não é permitido adicionar um day off em uma data passada";
					return;
				}
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
