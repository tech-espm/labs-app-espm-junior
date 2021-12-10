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

interface HoraPessoal {
	idhorapessoal: number;
	idusuario: number;
	ano: number;
	ciclo: number;
	minutos: number;
	data: string;
	criacao: string;
}

interface ItemListaIndividual {
	data: string;
	minutos?: number;
}

interface ItemLista {
	nome: string;
	data: string;
	minutos?: number;
	id_departamento: number;
	desc_departamento: string;
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
		const hoje = parseInt(DataUtil.horarioDeBrasiliaISO().replace(DayOff.RegExp, "")),
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
			const hoje = parseInt(DataUtil.horarioDeBrasiliaISO().replace(DayOff.RegExp, "")),
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

	public static listarDaysOff(ano: number, ciclo: number, idusuario: number): Promise<ItemListaIndividual[]> {
		return Sql.conectar(async (sql: Sql) => {
			return await sql.query("select date_format(data, '%Y-%m-%d') data from dayoff where ano = ? and ciclo = ? and idusuario = ? order by data asc", [ano, ciclo, idusuario]);
		});
	}

	public static listarHoras(ano: number, ciclo: number, idusuario: number): Promise<ItemListaIndividual[]> {
		return Sql.conectar(async (sql: Sql) => {
			return await sql.query("select date_format(data, '%Y-%m-%d') data, minutos from horapessoal where ano = ? and ciclo = ? and idusuario = ? order by data asc", [ano, ciclo, idusuario]);
		});
	}

	private static async listar(daysOff: boolean, horasPessoais: boolean, ano: number, ciclo: number, idusuario: number): Promise<ItemListaIndividual[]> {
		let lista: ItemListaIndividual[] = null;
		let lista2: ItemListaIndividual[] = null;


		if (!lista || !lista.length)
			return (lista2 || []);

		if (lista2 && lista2.length)
			lista.push.apply(lista, lista2);

		return lista;
	}

	public static async listarDaysOffEHorasPorMes(ano: number, mes: number, idusuario?: number, id_departamento?: number): Promise<ItemLista[]> {
		let lista: ItemLista[] = null;
		let lista2: ItemLista[] = null;

		await Sql.conectar(async (sql: Sql) => {
			const dataInicial = ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-01";

			mes++;
			if (mes >= 13) {
				mes = 1;
				ano++;
			}

			const dataFinal = ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-01";

			lista = await sql.query("select u.nome, date_format(d.data, '%Y-%m-%d') data, u.id_departamento, dp.desc_departamento from dayoff d inner join usuario u on u.idusuario = d.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento where d.data >= ? and d.data < ?" + (idusuario ? (" and d.idusuario = ? order by d.data asc") : (id_departamento ? " and u.id_departamento = ?" : "")), (idusuario || id_departamento) ? [dataInicial, dataFinal, idusuario || id_departamento] : [dataInicial, dataFinal]);

			lista2 = await sql.query("select u.nome, date_format(h.data, '%Y-%m-%d') data, h.minutos, u.id_departamento, dp.desc_departamento from horapessoal h inner join usuario u on u.idusuario = h.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento where h.data >= ? and h.data < ?" + (idusuario ? (" and h.idusuario = ? order by h.data asc") : (id_departamento ? " and u.id_departamento = ?" : "")), (idusuario || id_departamento) ? [dataInicial, dataFinal, idusuario || id_departamento] : [dataInicial, dataFinal]);
		});

		if (!lista || !lista.length)
			return (lista2 || []);

		if (lista2 && lista2.length)
			lista.push.apply(lista, lista2);

		return lista;
	}

	public static async sincronizarDaysOff(ano: number, ciclo: number, idusuario: number, daysOff: string[]): Promise<string> {
		if (!daysOff)
			daysOff = [];
		else if (!Array.isArray(daysOff))
			daysOff = [ daysOff as any ];

		const infoAtual = await DayOff.infoAtual(),
			regexp = DayOff.RegExp,
			hoje = infoAtual.hoje,
			anoInicialCiclo = infoAtual.anoInicialCiclo,
			cicloAtual = infoAtual.cicloAtual;

		if (ano !== anoInicialCiclo || ciclo !== cicloAtual)
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
				res = "Usuário não tem permissão para tirar days off";
				return;
			}

			const antigos: DayOff[] = await sql.query("select iddayoff, date_format(data, '%Y-%m-%d') data from dayoff where ano = ? and ciclo = ? and idusuario = ?", [anoInicialCiclo, cicloAtual, idusuario]);
			const adicionar = daysOff;
			const atualizar: DayOff[] = [];
			const datasUtilizadas: any = {};

			let daysOffTotais = 0;

			for (let i = antigos.length - 1; i >= 0; i--) {
				const data = antigos[i].data;

				for (let j = adicionar.length - 1; j >= 0; j--) {
					if (adicionar[j] === data) {
						datasUtilizadas[data] = true;
						daysOffTotais++;
						antigos.splice(i, 1);
						adicionar.splice(j, 1);
						break;
					}
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				const data = adicionar[i];

				if (datasUtilizadas[data]) {
					res = "Não é permitido adicionar days off mais de uma vez na mesma data (" + DataUtil.converterDataISO(data, true) + ")";
					return;
				}

				datasUtilizadas[data] = true;

				daysOffTotais++;
			}

			if (daysOffTotais > quantidadeMaxima) {
				res = "Não é permitido tirar mais de " + quantidadeMaxima + " days off por ciclo";
				return;
			}

			for (let i = antigos.length - 1; i >= 0; i--) {
				if (parseInt(antigos[i].data.replace(regexp, "")) < hoje) {
					res = "Não é permitido editar ou excluir days off de uma data passada (" + DataUtil.converterDataISO(antigos[i].data, true) + ")";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (parseInt(adicionar[i].replace(regexp, "")) < hoje) {
					res = "Não é permitido adicionar days off em uma data passada (" + DataUtil.converterDataISO(adicionar[i], true) + ")";
					return;
				}

				if (await sql.scalar("select 1 from horapessoal where idusuario = ? and data = ?", [idusuario, adicionar[i]])) {
					res = "Não é permitido adicionar um day off na data " + DataUtil.converterDataISO(adicionar[i], true) + " porque já existem horas pessoais nessa data";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (!antigos.length)
					break;

				// Tenta reutilizar registros existentes
				const reutilizar = antigos.pop();
				reutilizar.data = adicionar[i];
				adicionar.splice(i, 1);
				atualizar.push(reutilizar);
			}

			const agora = DataUtil.horarioDeBrasiliaISOComHorario();

			await sql.beginTransaction();

			for (let i = antigos.length - 1; i >= 0; i--)
				await sql.query("delete from dayoff where iddayoff = ?", [antigos[i].iddayoff]);

			for (let i = atualizar.length - 1; i >= 0; i--)
				await sql.query("update dayoff set data = ?, criacao = ? where iddayoff = ?", [atualizar[i].data, agora, atualizar[i].iddayoff]);

			for (let i = adicionar.length - 1; i >= 0; i--)
				await sql.query("insert into dayoff (idusuario, ano, ciclo, data, criacao) values (?, ?, ?, ?, ?)", [idusuario, anoInicialCiclo, cicloAtual, adicionar[i], agora]);

			await sql.commit();
		});

		return res;
	}

	public static async sincronizarHoras(ano: number, ciclo: number, idusuario: number, horasPessoaisDatas: string[], horasPessoaisMinutos: number[]): Promise<string> {
		if (!horasPessoaisDatas)
			horasPessoaisDatas = [];
		else if (!Array.isArray(horasPessoaisDatas))
			horasPessoaisDatas = [ horasPessoaisDatas as any ];

		if (!horasPessoaisMinutos)
			horasPessoaisMinutos = [];
		else if (!Array.isArray(horasPessoaisMinutos))
			horasPessoaisMinutos = [ horasPessoaisMinutos as any ];

		if (horasPessoaisDatas.length !== horasPessoaisMinutos.length)
			return "Quantidade de datas diferente da quantidade de minutos";

		const horasPessoais: HoraPessoal[] = new Array(horasPessoaisDatas.length);
		for (let i = horasPessoaisDatas.length - 1; i >= 0; i--)
			horasPessoais[i] = {
				data: horasPessoaisDatas[i],
				minutos: horasPessoaisMinutos[i]
			} as any;

		const infoAtual = await DayOff.infoAtual(),
			regexp = DayOff.RegExp,
			hoje = infoAtual.hoje,
			anoInicialCiclo = infoAtual.anoInicialCiclo,
			cicloAtual = infoAtual.cicloAtual;

		if (ano !== anoInicialCiclo || ciclo !== cicloAtual)
			return "Não é permitido sincronizar horas pessoais de um ciclo diferente do atual";

		for (let i = horasPessoais.length - 1; i >= 0; i--) {
			if (!horasPessoais[i])
				return "Data em branco";

			if (!(horasPessoais[i].data = DataUtil.converterDataISO(horasPessoais[i].data)))
				return "Data inválida";

			const data = parseInt(horasPessoais[i].data.replace(regexp, "")),
				anoData = (data / 10000) | 0,
				mesData = ((data / 100) | 0) % 100;

			if (!DayOff.dataPertenceAoCiclo(mesData, anoData, infoAtual))
				return "Não é permitido sincronizar horas pessoais de um mês/ano fora do mês/ano do ciclo atual";

			horasPessoais[i].minutos = parseInt(horasPessoais[i].minutos as any);

			if (isNaN(horasPessoais[i].minutos) || horasPessoais[i].minutos <= 0)
				return "Horas inválidas";

			if (horasPessoais[i].minutos !== 30 && horasPessoais[i].minutos !== 60 &&
				horasPessoais[i].minutos !== 90 && horasPessoais[i].minutos !== 120 &&
				horasPessoais[i].minutos !== 150 && horasPessoais[i].minutos !== 180 &&
				horasPessoais[i].minutos !== 210)
				return "A quantidade de horas deve estar entre 00:30 e 03:30, e deve ser um múltiplo de 30 minutos";
		}

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const antigos: HoraPessoal[] = await sql.query("select idhorapessoal, minutos, date_format(data, '%Y-%m-%d') data from horapessoal where ano = ? and ciclo = ? and idusuario = ?", [anoInicialCiclo, cicloAtual, idusuario]);
			const adicionar = horasPessoais;
			const atualizar: HoraPessoal[] = [];
			const datasUtilizadas: any = {};

			let minutosTotais = 0;

			for (let i = antigos.length - 1; i >= 0; i--) {
				const data = antigos[i].data,
					minutos = antigos[i].minutos;

				for (let j = adicionar.length - 1; j >= 0; j--) {
					if (adicionar[j].data === data && adicionar[j].minutos === minutos) {
						datasUtilizadas[data] = true;
						minutosTotais += minutos;
						antigos.splice(i, 1);
						adicionar.splice(j, 1);
					}
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				const data = adicionar[i].data,
					minutos = adicionar[i].minutos;

				if (datasUtilizadas[data]) {
					res = "Não é permitido tirar horas pessoais mais de uma vez na mesma data (" + DataUtil.converterDataISO(data, true) + ")";
					return;
				}

				datasUtilizadas[data] = true;

				minutosTotais += minutos;
			}

			if (minutosTotais > (12 * 60)) {
				res = "Não é permitido tirar mais de 12 horas pessoais por ciclo";
				return;
			}

			for (let i = antigos.length - 1; i >= 0; i--) {
				if (parseInt(antigos[i].data.replace(regexp, "")) < hoje) {
					res = "Não é permitido editar ou excluir horas pessoais de uma data passada (" + DataUtil.converterDataISO(antigos[i].data, true) + ")";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (parseInt(adicionar[i].data.replace(regexp, "")) < hoje) {
					res = "Não é permitido adicionar horas pessoais em uma data passada (" + DataUtil.converterDataISO(adicionar[i].data, true) + ")";
					return;
				}

				if (await sql.scalar("select 1 from dayoff where idusuario = ? and data = ?", [idusuario, adicionar[i].data])) {
					res = "Não é permitido adicionar horas pessoais na data " + DataUtil.converterDataISO(adicionar[i].data, true) + " porque já existe um day off nessa data";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (!antigos.length)
					break;

				// Tenta reutilizar registros existentes
				const reutilizar = antigos.pop();
				reutilizar.data = adicionar[i].data;
				reutilizar.minutos = adicionar[i].minutos;
				adicionar.splice(i, 1);
				atualizar.push(reutilizar);
			}

			const agora = DataUtil.horarioDeBrasiliaISOComHorario();

			await sql.beginTransaction();

			for (let i = antigos.length - 1; i >= 0; i--)
				await sql.query("delete from horapessoal where idhorapessoal = ?", [antigos[i].idhorapessoal]);

			for (let i = atualizar.length - 1; i >= 0; i--)
				await sql.query("update horapessoal set minutos = ?, data = ?, criacao = ? where idhorapessoal = ?", [atualizar[i].minutos, atualizar[i].data, agora, atualizar[i].idhorapessoal]);

			for (let i = adicionar.length - 1; i >= 0; i--)
				await sql.query("insert into horapessoal (idusuario, ano, ciclo, minutos, data, criacao) values (?, ?, ?, ?, ?, ?)", [idusuario, anoInicialCiclo, cicloAtual, adicionar[i].minutos, adicionar[i].data, agora]);

			await sql.commit();
		});

		return res;
	}
};
