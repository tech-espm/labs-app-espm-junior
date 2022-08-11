import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");
import Ciclo = require("./ciclo");

interface AnoMes {
	ano: number;
	mes: number;
}

interface HoraPessoal {
	idhorapessoal: number;
	idusuario: number;
	idciclo: number;
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
	public static readonly HorarioLimiteAlteracoesHoje = 14;

	public iddayoff: number;
	public idusuario: number;
	public idciclo: number;
	public data: string;
	public criacao: string;

	public static anoMesAtual(): AnoMes {
		const d = new Date();
		return {
			ano: d.getFullYear(),
			mes: d.getMonth() + 1
		};
	}

	public static listarDaysOff(idusuario: number, idciclo?: number): Promise<ItemListaIndividual[]> {
		return Sql.conectar(async (sql: Sql) => {
			if (!idciclo)
				idciclo = await Ciclo.obterIdAtual(idusuario, sql);

			return await sql.query("select date_format(data, '%Y-%m-%d') data from dayoff where idusuario = ? and idciclo = ? order by data asc", [idusuario, idciclo]);
		});
	}

	public static listarHoras(idusuario: number, idciclo?: number): Promise<ItemListaIndividual[]> {
		return Sql.conectar(async (sql: Sql) => {
			if (!idciclo)
				idciclo = await Ciclo.obterIdAtual(idusuario, sql);

			return await sql.query("select date_format(data, '%Y-%m-%dT%H:%i:%s') data, minutos from horapessoal where idusuario = ? and idciclo = ? order by data asc", [idusuario, idciclo]);
		});
	}

	public static async listarDaysOffEHorasPorMes(ano: number, mes: number, idusuario?: number, id_departamento?: number, idcargo?: number): Promise<ItemLista[]> {
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

			let where = "d.data >= ? and d.data < ?";
			let parametros: any[] = [dataInicial, dataFinal];

			if (idusuario) {
				where += " and d.idusuario = ? order by d.data asc";
				parametros.push(idusuario);
			} else {
				if (id_departamento) {
					where += " and u.id_departamento = ?";
					parametros.push(id_departamento);
				}
				if (idcargo) {
					where += " and u.idcargo = ?";
					parametros.push(idcargo);
				}
			}

			lista = await sql.query("select u.nome, date_format(d.data, '%Y-%m-%d') data, u.id_departamento, dp.desc_departamento, u.idcargo, c.nome nome_cargo from dayoff d inner join usuario u on u.idusuario = d.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento inner join cargo c on c.idcargo = u.idcargo where " + where, parametros);

			where = "h.data >= ? and h.data < ?";
			parametros = [dataInicial, dataFinal];

			if (idusuario) {
				where += " and h.idusuario = ? order by h.data asc";
				parametros.push(idusuario);
			} else {
				if (id_departamento) {
					where += " and u.id_departamento = ?";
					parametros.push(id_departamento);
				}
				if (idcargo) {
					where += " and u.idcargo = ?";
					parametros.push(idcargo);
				}
			}
			lista2 = await sql.query("select u.nome, date_format(h.data, '%Y-%m-%d') data, date_format(h.data, '%H:%i') inicio, h.minutos, u.id_departamento, dp.desc_departamento, u.idcargo, c.nome nome_cargo from horapessoal h inner join usuario u on u.idusuario = h.idusuario inner join departamento dp on dp.id_departamento = u.id_departamento inner join cargo c on c.idcargo = u.idcargo where " + where, parametros);
		});

		if (!lista || !lista.length)
			return (lista2 || []);

		if (lista2 && lista2.length)
			lista.push.apply(lista, lista2);

		return lista;
	}

	public static async sincronizarDaysOff(idusuario: number, idciclo: number, daysOff: string[]): Promise<string> {
		if (!daysOff)
			daysOff = [];
		else if (!Array.isArray(daysOff))
			daysOff = [ daysOff as any ];

		const cicloAtual = await Ciclo.obterAtual(idusuario),
			hoje = DataUtil.horarioDeBrasiliaISO(),
			horaAtual = DataUtil.horarioDeBrasiliaComoDateUTC().getUTCHours();

		if (!cicloAtual)
			return "Usuário não tem um ciclo atual";

		if (cicloAtual.termino)
			return "O ciclo atual do usuário está encerrado";

		if (idciclo !== cicloAtual.idciclo)
			return "Não é permitido sincronizar days off de um ciclo diferente do atual";

		for (let i = daysOff.length - 1; i >= 0; i--) {
			if (!daysOff[i])
				return "Day off em branco";

			if (!(daysOff[i] = DataUtil.converterDataISO(daysOff[i])))
				return "Data inválida";

			if (!Ciclo.dataPertenceAoCiclo(daysOff[i], cicloAtual))
				return "Não é permitido sincronizar days off de uma data fora do ciclo atual";
		}

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const quantidadeMaxima = await sql.scalar("select daysoff from usuario where idusuario = ?", [idusuario]) as number;
			if (!quantidadeMaxima) {
				res = "Usuário não tem permissão para tirar days off";
				return;
			}

			const antigos: DayOff[] = await sql.query("select iddayoff, date_format(data, '%Y-%m-%d') data from dayoff where idusuario = ? and idciclo = ?", [idusuario, cicloAtual.idciclo]);
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

			for (let i = adicionar.length - 1; i >= 0; i--) {
				const data = adicionar[i];

				const diaAnterior = DataUtil.removerHorario((new Date(new Date(data).getTime() - (24 * 60 * 60 * 1000))).toISOString()),
					diaSeguinte = DataUtil.removerHorario((new Date(new Date(data).getTime() + (24 * 60 * 60 * 1000))).toISOString());

				if (datasUtilizadas[diaAnterior] || datasUtilizadas[diaSeguinte]) {
					res = "Não é permitido tirar days off em dias consecutivos (" + DataUtil.converterDataISO(data, true) + ")";
					return;
				}
			}

			if (daysOffTotais > quantidadeMaxima) {
				res = "Não é permitido tirar mais de " + quantidadeMaxima + " days off por ciclo";
				return;
			}

			for (let i = antigos.length - 1; i >= 0; i--) {
				if (antigos[i].data < hoje) {
					res = "Não é permitido editar ou excluir days off de uma data passada (" + DataUtil.converterDataISO(antigos[i].data, true) + ")";
					return;
				}

				if (antigos[i].data === hoje && horaAtual >= DayOff.HorarioLimiteAlteracoesHoje) {
					res = "Não é permitido editar ou excluir days off do próprio dia depois das " + DayOff.HorarioLimiteAlteracoesHoje + ":00";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (adicionar[i] < hoje) {
					res = "Não é permitido adicionar days off em uma data passada (" + DataUtil.converterDataISO(adicionar[i], true) + ")";
					return;
				}

				if (adicionar[i] === hoje && horaAtual >= DayOff.HorarioLimiteAlteracoesHoje) {
					res = "Não é permitido adicionar days off para o próprio dia depois das " + DayOff.HorarioLimiteAlteracoesHoje + ":00";
					return;
				}

				if (await sql.scalar("select 1 from horapessoal where idusuario = ? and data >= ? and data <= ?", [idusuario, adicionar[i] + " 00:00:00", adicionar[i] + " 23:59:59"])) {
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
				await sql.query("insert into dayoff (idusuario, idciclo, data, criacao) values (?, ?, ?, ?)", [idusuario, cicloAtual.idciclo, adicionar[i], agora]);

			await sql.commit();
		});

		return res;
	}

	public static async sincronizarHoras(idusuario: number, idciclo: number, horasPessoaisDatas: string[], horasPessoaisMinutos: number[]): Promise<string> {
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

		const cicloAtual = await Ciclo.obterAtual(idusuario),
			hoje = DataUtil.horarioDeBrasiliaISO(),
			hojeMeiaNoite = hoje + " 00:00:00",
			horaAtual = DataUtil.horarioDeBrasiliaComoDateUTC().getUTCHours();

		if (!cicloAtual)
			return "Usuário não tem um ciclo atual";

		if (cicloAtual.termino)
			return "O ciclo atual do usuário está encerrado";

		if (idciclo !== cicloAtual.idciclo)
			return "Não é permitido sincronizar horas pessoais de um ciclo diferente do atual";

		for (let i = horasPessoais.length - 1; i >= 0; i--) {
			if (!horasPessoais[i])
				return "Data em branco";

			if (!(horasPessoais[i].data = DataUtil.converterDataISO(horasPessoais[i].data)))
				return "Data inválida";

			if (horasPessoais[i].data.length !== 19)
				return "Data sem horário";

			if (!Ciclo.dataPertenceAoCiclo(horasPessoais[i].data, cicloAtual))
				return "Não é permitido sincronizar horas pessoais de uma data fora do ciclo atual";

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
			const antigos: HoraPessoal[] = await sql.query("select idhorapessoal, minutos, date_format(data, '%Y-%m-%d %H:%i:%s') data from horapessoal where idusuario = ? and idciclo = ?", [idusuario, cicloAtual.idciclo]);
			const adicionar = horasPessoais;
			const atualizar: HoraPessoal[] = [];
			const datasUtilizadas: any = {};

			let minutosTotais = 0;

			for (let i = antigos.length - 1; i >= 0; i--) {
				const data = antigos[i].data,
					minutos = antigos[i].minutos;

				for (let j = adicionar.length - 1; j >= 0; j--) {
					if (adicionar[j].data === data && adicionar[j].minutos === minutos) {
						datasUtilizadas[DataUtil.removerHorario(data)] = true;
						minutosTotais += minutos;
						antigos.splice(i, 1);
						adicionar.splice(j, 1);
					}
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				const data = adicionar[i].data,
					dataSemHorario = DataUtil.removerHorario(data),
					minutos = adicionar[i].minutos;

				if (datasUtilizadas[dataSemHorario]) {
					res = "Não é permitido tirar horas pessoais mais de uma vez na mesma data (" + DataUtil.converterDataISO(data, true) + ")";
					return;
				}

				datasUtilizadas[dataSemHorario] = true;

				minutosTotais += minutos;
			}

			if (minutosTotais > (12 * 60)) {
				res = "Não é permitido tirar mais de 12 horas pessoais por ciclo";
				return;
			}

			for (let i = antigos.length - 1; i >= 0; i--) {
				if (antigos[i].data < hojeMeiaNoite) {
					res = "Não é permitido editar ou excluir horas pessoais de uma data passada (" + DataUtil.converterDataISO(antigos[i].data, true) + ")";
					return;
				}

				if (DataUtil.removerHorario(antigos[i].data) === hoje && horaAtual >= DayOff.HorarioLimiteAlteracoesHoje) {
					res = "Não é permitido editar ou excluir horas pessoais do próprio dia depois das " + DayOff.HorarioLimiteAlteracoesHoje + ":00";
					return;
				}
			}

			for (let i = adicionar.length - 1; i >= 0; i--) {
				if (adicionar[i].data < hojeMeiaNoite) {
					res = "Não é permitido adicionar horas pessoais em uma data passada (" + DataUtil.converterDataISO(adicionar[i].data, true) + ")";
					return;
				}

				if (DataUtil.removerHorario(adicionar[i].data) === hoje && horaAtual >= DayOff.HorarioLimiteAlteracoesHoje) {
					res = "Não é permitido adicionar horas pessoais para o próprio dia depois das " + DayOff.HorarioLimiteAlteracoesHoje + ":00";
					return;
				}

				if (await sql.scalar("select 1 from dayoff where idusuario = ? and data = ?", [idusuario, DataUtil.removerHorario(adicionar[i].data)])) {
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
				await sql.query("insert into horapessoal (idusuario, idciclo, minutos, data, criacao) values (?, ?, ?, ?, ?)", [idusuario, cicloAtual.idciclo, adicionar[i].minutos, adicionar[i].data, agora]);

			await sql.commit();
		});

		return res;
	}
};
