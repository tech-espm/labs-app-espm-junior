import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");

interface InfoAtualSemCiclo {
	hoje: number;
	anoAtual: number;
	mesAtual: number;
}

interface InfoAtual extends InfoAtualSemCiclo {
	cicloAtual: number;
	mesInicialCiclo: number;
	anoInicialCiclo: number;
	mesFinalCiclo: number;
	anoFinalCiclo: number;
}

export = class DayOff {
	private static readonly RegExp = /[\/\-\:\s]/g;

	public iddayoff: number;
	public idusuario: number;
	public ano: number;
	public ciclo: number;
	public data: string;
	public criacao: string;

	public static infoAtualSemCiclo(): InfoAtualSemCiclo {
		const hoje = parseInt(DataUtil.hojeISO().replace(DayOff.RegExp, "")),
			anoAtual = (hoje / 10000) | 0,
			mesAtual = ((hoje / 100) | 0) % 100;

		return {
			hoje,
			anoAtual,
			mesAtual
		};
	}

	public static infoAtual(): Promise<InfoAtual> {
		return Sql.conectar(async (sql) => {
			const hoje = parseInt(DataUtil.hojeISO().replace(DayOff.RegExp, "")),
				anoAtual = (hoje / 10000) | 0,
				mesAtual = ((hoje / 100) | 0) % 100,
				info = await sql.query("select cicloatual, mesinicialciclo, anoinicialciclo, mesfinalciclo, anofinalciclo from config") as any[];

			return {
				hoje,
				anoAtual,
				mesAtual,
				cicloAtual: info[0].cicloatual,
				mesInicialCiclo: info[0].mesinicialciclo,
				anoInicialCiclo: info[0].anoinicialciclo,
				mesFinalCiclo: info[0].mesfinalciclo,
				anoFinalCiclo: info[0].anofinalciclo
			};
		});
	}

	public static async atualizarCicloAtual(infoAtual: InfoAtual): Promise<string> {
		if (!infoAtual)
			return "Dados inválidos";

		const { anoAtual } = DayOff.infoAtualSemCiclo();

		if (isNaN(infoAtual.cicloAtual = parseInt(infoAtual.cicloAtual as any)) || infoAtual.cicloAtual < 1 || infoAtual.cicloAtual > 2)
			return "Ciclo atual inválido";

		if (isNaN(infoAtual.mesInicialCiclo = parseInt(infoAtual.mesInicialCiclo as any)) || infoAtual.mesInicialCiclo < 1 || infoAtual.mesInicialCiclo > 12)
			return "Mês inicial do ciclo atual inválido";

		if (isNaN(infoAtual.anoInicialCiclo = parseInt(infoAtual.anoInicialCiclo as any)) || Math.abs(anoAtual - infoAtual.anoInicialCiclo) > 1)
			return `Ano inicial do ciclo atual inválido (deve ser ${anoAtual - 1}, ${anoAtual} ou ${anoAtual + 1})`;

		if (isNaN(infoAtual.mesFinalCiclo = parseInt(infoAtual.mesFinalCiclo as any)) || infoAtual.mesFinalCiclo < 1 || infoAtual.mesFinalCiclo > 12)
			return "Mês final do ciclo atual inválido";

		if (isNaN(infoAtual.anoFinalCiclo = parseInt(infoAtual.anoFinalCiclo as any)) || Math.abs(anoAtual - infoAtual.anoFinalCiclo) > 1)
			return `Ano final do ciclo atual inválido (deve ser ${anoAtual - 1}, ${anoAtual} ou ${anoAtual + 1})`;

		if (infoAtual.cicloAtual === 1) {
			if (infoAtual.mesInicialCiclo >= infoAtual.mesFinalCiclo)
				return "O mês inicial do ciclo 1 deve ser menor que o mês final";

			if (infoAtual.anoInicialCiclo !== infoAtual.anoFinalCiclo)
				return "O ciclo 1 deve iniciar e terminar no mesmo ano";
		} else {
			if (infoAtual.mesInicialCiclo <= infoAtual.mesFinalCiclo)
				return "O mês inicial do ciclo 2 deve ser maior que o mês final";
		}

		await Sql.conectar(async (sql) => {
			await sql.query("update config set cicloatual = ?, mesinicialciclo = ?, anoinicialciclo = ?, mesfinalciclo = ?, anofinalciclo = ?", [infoAtual.cicloAtual, infoAtual.mesInicialCiclo, infoAtual.anoInicialCiclo, infoAtual.mesFinalCiclo, infoAtual.anoFinalCiclo]);
		});

		return null;
	}

	public static dataPertenceAoCiclo(mesData: number, anoData: number, infoAtual: InfoAtual): boolean {
		if (infoAtual.cicloAtual === 1)
			return (mesData >= infoAtual.mesInicialCiclo && mesData <= infoAtual.mesFinalCiclo && anoData === infoAtual.anoInicialCiclo);
		else
			return (mesData >= infoAtual.mesInicialCiclo && mesData <= 12 && anoData === infoAtual.anoInicialCiclo) || (mesData >= 1 && mesData <= infoAtual.mesFinalCiclo && anoData === infoAtual.anoFinalCiclo);
	}

	public static async listar(ano?: number, ciclo?: number, idusuario?: number, id_departamento?: number): Promise<{ nome: string, data: string, id_departamento: number, desc_departamento: string }[]> {
		if (!ano || !ciclo) {
			const infoAtual = await DayOff.infoAtual();

			if (!ano)
				ano = infoAtual.anoAtual;

			if (!ciclo)
				ciclo = infoAtual.cicloAtual;
		}

		let lista: { nome: string, data: string, id_departamento: number, desc_departamento: string }[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.nome, date_format(d.data, '%Y-%m-%d') data, u.id_departamento, dp.desc_departamento from dayoff d inner join usuario u on u.idusuario = d.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento where d.ano = ? and d.ciclo = ?" + (idusuario ? (" and d.idusuario = ? order by d.data asc") : (id_departamento ? " and u.id_departamento = ?" : "")), (idusuario || id_departamento) ? [ano, ciclo, idusuario || id_departamento] : [ano, ciclo]);
		});

		return lista || [];
	}

	public static async sincronizar(ano: number, ciclo: number, idusuario: number, daysOff: string[]): Promise<string> {
		if (!daysOff)
			daysOff = [];
		else if (!Array.isArray(daysOff))
			daysOff = [ daysOff as any ];

		const infoAtual = await DayOff.infoAtual(),
			regexp = DayOff.RegExp,
			hoje = infoAtual.hoje,
			anoInicialCiclo = infoAtual.anoInicialCiclo,
			cicloAtual = infoAtual.cicloAtual;

		if (ciclo !== cicloAtual)
			return "Não é permitido sincronizar days off de um ciclo diferente do atual";

		for (let i = daysOff.length - 1; i >= 0; i--) {
			if (!daysOff[i])
				return "Day off em branco";

			if (!(daysOff[i] = DataUtil.converterDataISO(daysOff[i])))
				return "Data inválida";

			const data = parseInt(daysOff[i].replace(regexp, "")),
				anoData = (data / 10000) | 0,
				mesData = ((data / 100) | 0) % 100;

			if (!DayOff.dataPertenceAoCiclo(mesData, anoData, infoAtual))
				return "Não é permitido sincronizar days off de um mês/ano fora do mês/ano do ciclo atual";
		}

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const quantidadeMaxima = await sql.scalar("select daysoff from usuario where idusuario = ?", [idusuario]) as number;
			if (!quantidadeMaxima) {
				res = "Usuário não tem permissão para pedir days off";
				return;
			}

			const antigos: DayOff[] = await sql.query("select iddayoff, date_format(data, '%Y-%m-%d') data from dayoff where ano = ? and ciclo = ? and idusuario = ?", [anoInicialCiclo, cicloAtual, idusuario]);
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
				res = "Não é permitido pedir mais de " + quantidadeMaxima + " days off por ciclo";
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
				await sql.query("insert into dayoff (idusuario, ano, ciclo, data, criacao) values (?, ?, ?, ?, now())", [idusuario, anoInicialCiclo, cicloAtual, adicionar[i]]);

			await sql.commit();
		});

		return res;
	}
};
