import Sql = require("../infra/sql");
import DataUtil = require("../utils/dataUtil");

export = class Evento {
	public id_evento: number;
	public nome_evento: string;
	public desc_evento: string;
	public inicio_evento: string;
	public termino_evento: string;
	public id_sala:number;
	public ocorrencias: string[];
	public ids_departamento: number[];
	public ids_cargo: number[];

	public static async listarHoje(): Promise<Evento[]> {
		let inicioDiaHoje = DataUtil.horarioDeBrasiliaISOInicioDoDia();
		let fimDiaHoje = DataUtil.horarioDeBrasiliaISOFimDoDia();

		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = (await sql.query("select id_evento, nome_evento, desc_evento, date_format(inicio_evento, '%Y-%m-%dT%T') inicio_evento, date_format(termino_evento, '%Y-%m-%dT%T') termino_evento from evento where inicio_evento <= ? and termino_evento >= ?", [fimDiaHoje, inicioDiaHoje])) as Evento[];
		
		});

		//if (lista !== null) {
		//	return lista;
		//} else {
		//	return [];
		//}

		return lista || [];
	}

	public static validar(evento: Evento, criacao: boolean): string {
		if (!evento) {
			return "Dados inválidos";
		}

		evento.nome_evento = (evento.nome_evento || "").normalize().trim();
		if (!evento.nome_evento || evento.nome_evento.length>100) {
			return "Nome inválido";
		}

		evento.desc_evento = (evento.desc_evento || "").normalize().trim();
		if (evento.desc_evento.length > 100) {
			return "Link / URL inválida";
		}

		evento.inicio_evento = DataUtil.converterDataISO(evento.inicio_evento);
		if (!evento.inicio_evento) {
			//validação de data será aqui?
			return "Data de Início inválida";
		}
		evento.inicio_evento += " 00:00:00";

		evento.termino_evento = DataUtil.converterDataISO(evento.termino_evento);
		if (!evento.termino_evento) {
			//validação de data será aqui?
			return "Data de Término inválida";
		}
		evento.termino_evento += " 23:59:59";

		if (evento.inicio_evento > evento.termino_evento)
			return "Data de Início deve ser anterior à Data de Término";

		if (!evento.ids_departamento) {
			return "Departamentos inválidos";
		} else {
			if (!Array.isArray(evento.ids_departamento))
				evento.ids_departamento = [ evento.ids_departamento as any ];

			for (let i = evento.ids_departamento.length - 1; i >= 0; i--) {
				if (!(evento.ids_departamento[i] = parseInt(evento.ids_departamento[i] as any)))
					return "Departamento inválido";
			}

			evento.ids_departamento.sort();

			for (let i = evento.ids_departamento.length - 1; i > 0; i--) {
				if (evento.ids_departamento[i] === evento.ids_departamento[i - 1])
					return "Departamento repetido";
			}
		}

		if (!evento.ids_cargo) {
			return "Cargos inválidos";
		} else {
			if (!Array.isArray(evento.ids_cargo))
				evento.ids_cargo = [ evento.ids_cargo as any ];

			for (let i = evento.ids_cargo.length - 1; i >= 0; i--) {
				if (!(evento.ids_cargo[i] = parseInt(evento.ids_cargo[i] as any)))
					return "Cargo inválido";
			}

			evento.ids_cargo.sort();

			for (let i = evento.ids_cargo.length - 1; i > 0; i--) {
				if (evento.ids_cargo[i] === evento.ids_cargo[i - 1])
					return "Cargo repetido";
			}
		}

		evento.id_sala = parseInt(evento.id_sala as any);
		if (isNaN(evento.id_sala)) {
			return "Sala inválida";
		}

		if (!evento.ocorrencias) {
			if (criacao)
				evento.ocorrencias = [DataUtil.removerHorario(evento.inicio_evento) + " 14:00:00"];
			else
				evento.ocorrencias = [];
		} else {
			if (!Array.isArray(evento.ocorrencias))
				evento.ocorrencias = [ evento.ocorrencias as any ];

			for (let i = evento.ocorrencias.length - 1; i >= 0; i--) {
				if (!(evento.ocorrencias[i] = DataUtil.converterDataISO(evento.ocorrencias[i])))
					return "Data da ocorrência inválida";
				if (evento.ocorrencias[i].length === 10)
					evento.ocorrencias[i] += " 14:00:00";
				if (evento.ocorrencias[i] < evento.inicio_evento)
					return "Data da ocorrência anterior ao início do evento";
				if (evento.ocorrencias[i] > evento.termino_evento)
					return "Data da ocorrência posterior ao término do evento";
			}

			evento.ocorrencias.sort();

			for (let i = evento.ocorrencias.length - 1; i > 0; i--) {
				if (evento.ocorrencias[i] === evento.ocorrencias[i - 1])
					return "Data da ocorrência repetida";
			}
		}
		return null;
	}

	public static listar(id_departamento?: number, idcargo?: number, id_sala?: number, ano?: number, mes?: number, dia?: number): Promise<Evento[]> {
		return Sql.conectar(async (sql) => {
			let where = "";
			let parametros: any[] = [];

			if (id_departamento > 0) {
				if (where)
					where += " and ";
				where += " exists (select 1 from evento_departamento ed where ed.id_evento = e.id_evento and ed.id_departamento = ? limit 1) ";
				parametros.push(id_departamento);
			}

			if (idcargo > 0) {
				if (where)
					where += " and ";
				where += " exists (select 1 from evento_cargo ec where ec.id_evento = e.id_evento and ec.idcargo = ? limit 1) ";
				parametros.push(idcargo);
			}

			if (id_sala > 0) {
				if (where)
					where += " and ";
				where += " es.id_sala = ? ";
				parametros.push(id_sala);
			}

			if (ano > 0) {
				if (where)
					where += " and ";
				let inicio: string, fim: string;
				if (mes >= 1 && mes <= 12) {
					if (dia >= 1 && dia <= 31) {
						inicio = DataUtil.formatar(ano, mes, dia);
						const dateInicial = new Date(ano, mes - 1, dia),
							dateFinal = new Date(dateInicial.getTime() + 100800000);
						fim = DataUtil.formatar(dateFinal.getFullYear(), dateFinal.getMonth() + 1, dateFinal.getDate());
					} else {
						inicio = DataUtil.formatar(ano, mes, 1);
						mes++;
						if (mes > 12) {
							mes = 1;
							ano++;
						}
						fim = DataUtil.formatar(ano, mes, 1);
					}
				} else {
					inicio = DataUtil.formatar(ano, 1, 1);
					fim = DataUtil.formatar(ano + 1, 1, 1);
				}
				where += " e.inicio_evento < ? and e.termino_evento >= ?";
				parametros.push(fim, inicio);
			}

			return await sql.query(`select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%d/%m/%Y') inicio_evento, date_format(e.termino_evento, '%d/%m/%Y') termino_evento,
				(
					select group_concat(t.desc_departamento order by t.desc_departamento asc separator ', ') desc_departamento
					from evento_departamento et
					inner join departamento t on t.id_departamento = et.id_departamento
					where et.id_evento = e.id_evento
				) desc_departamento,
				(
					select group_concat(c.nome order by c.nome asc separator ', ') nome_cargo
					from evento_cargo ea
					inner join cargo c on c.idcargo = ea.idcargo
					where ea.id_evento = e.id_evento
				) nome_cargo,
				s.desc_sala
				from evento e
				inner join evento_sala es on es.id_evento = e.id_evento
				inner join sala s on s.id_sala = es.id_sala
				` +
				(where ? (" where " + where) : ""), parametros);
		});
	}

	public static listarOcorrencias(id_departamento?: number, idcargo?: number, id_sala?: number, ano?: number, mes?: number, dia?: number): Promise<Evento[]> {
		return Sql.conectar(async (sql) => {
			let where = "";
			let parametros: any[] = [];

			if (id_departamento > 0) {
				if (where)
					where += " and ";
				where += " exists (select 1 from evento_departamento ed where ed.id_evento = e.id_evento and ed.id_departamento = ? limit 1) ";
				parametros.push(id_departamento);
			}

			if (idcargo > 0) {
				if (where)
					where += " and ";
				where += " exists (select 1 from evento_cargo ec where ec.id_evento = e.id_evento and ec.idcargo = ? limit 1) ";
				parametros.push(idcargo);
			}

			if (id_sala > 0) {
				if (where)
					where += " and ";
				where += " es.id_sala = ? ";
				parametros.push(id_sala);
			}

			if (ano > 0) {
				if (where)
					where += " and ";
				let inicio: string, fim: string;
				if (mes >= 1 && mes <= 12) {
					if (dia >= 1 && dia <= 31) {
						inicio = DataUtil.formatar(ano, mes, dia);
						const dateInicial = new Date(ano, mes - 1, dia),
							dateFinal = new Date(dateInicial.getTime() + 100800000);
						fim = DataUtil.formatar(dateFinal.getFullYear(), dateFinal.getMonth() + 1, dateFinal.getDate());
					} else {
						inicio = DataUtil.formatar(ano, mes, 1);
						mes++;
						if (mes > 12) {
							mes = 1;
							ano++;
						}
						fim = DataUtil.formatar(ano, mes, 1);
					}
				} else {
					inicio = DataUtil.formatar(ano, 1, 1);
					fim = DataUtil.formatar(ano + 1, 1, 1);
				}
				where += " eo.inicio_ocorrencia >= ? and eo.inicio_ocorrencia < ?";
				parametros.push(inicio,fim);
			}

			return await sql.query(`select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%d/%m/%Y') inicio_evento, date_format(e.termino_evento, '%d/%m/%Y') termino_evento, date_format(eo.inicio_ocorrencia, '%d/%m/%Y %H:%i') inicio_ocorrencia,
				(
					select group_concat(t.desc_departamento order by t.desc_departamento asc separator ', ') desc_departamento
					from evento_departamento et
					inner join departamento t on t.id_departamento = et.id_departamento
					where et.id_evento = e.id_evento
				) desc_departamento,
				(
					select group_concat(c.nome order by c.nome asc separator ', ') nome_cargo
					from evento_cargo ea
					inner join cargo c on c.idcargo = ea.idcargo
					where ea.id_evento = e.id_evento
				) nome_cargo,
				s.desc_sala
				from evento e
				inner join evento_sala es on es.id_evento = e.id_evento
				inner join sala s on s.id_sala = es.id_sala
				inner join evento_ocorrencia eo on eo.id_evento = e.id_evento
				` +
				(where ? (" where " + where) : ""), parametros);
		});
	}

	public static async criar(evento: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(evento, true)))
			return res;

		return Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into evento (nome_evento, desc_evento, inicio_evento, termino_evento) values (?,?,?,?)",[evento.nome_evento, evento.desc_evento, evento.inicio_evento, evento.termino_evento]);

				const id_evento: number = await sql.scalar("select last_insert_id()");

				for (let i = 0; i < evento.ids_departamento.length; i++)
					await sql.query("insert into evento_departamento (id_evento, id_departamento) values (?, ?)", [id_evento, evento.ids_departamento[i]]);

				for (let i = 0; i < evento.ids_cargo.length; i++)
					await sql.query("insert into evento_cargo (id_evento, idcargo) values (?, ?)", [id_evento, evento.ids_cargo[i]]);

				await sql.query("insert into evento_sala (id_evento, id_sala) values (?, ?)", [id_evento, evento.id_sala]);

				for (let i = 0; i < evento.ocorrencias.length; i++)
					await sql.query("insert into evento_ocorrencia (id_evento, inicio_ocorrencia) values (?, ?)", [id_evento, evento.ocorrencias[i]]);

				await sql.commit();

				return null;
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					return `O evento ${evento.nome_evento} já existe`; // evento.nome que está no alterar.ejs
				else
					throw e;
			}
		});
	} 

	public static obter(id_evento: number): Promise<Evento> {
		return Sql.conectar(async (sql) => {
			let lista: Evento[] = await sql.query("select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%Y-%m-%d') inicio_evento, date_format(e.termino_evento, '%Y-%m-%d') termino_evento, et.id_departamento, es.id_sala from evento e inner join evento_departamento et on et.id_evento = e.id_evento inner join evento_sala es on es.id_evento = e.id_evento where e.id_evento = ?", [id_evento]);
		 
			if (lista && lista.length) {
				const evento = lista[0];

				const ocorrencias: { inicio_ocorrencia: string }[] = await sql.query("select date_format(inicio_ocorrencia, '%Y-%m-%dT%H:%i') inicio_ocorrencia from evento_ocorrencia where id_evento = ? order by inicio_ocorrencia asc", [id_evento]);
				evento.ocorrencias = new Array(ocorrencias.length);
				for (let i = ocorrencias.length - 1; i >= 0; i--)
					evento.ocorrencias[i] = ocorrencias[i].inicio_ocorrencia;

				const departamentos: { id_departamento: number }[] = await sql.query("select ed.id_departamento from evento_departamento ed inner join departamento d on d.id_departamento = ed.id_departamento where ed.id_evento = ? order by d.desc_departamento asc", [id_evento]);
				evento.ids_departamento = new Array(departamentos.length);
				for (let i = departamentos.length - 1; i >= 0; i--)
					evento.ids_departamento[i] = departamentos[i].id_departamento;

				const cargos: { idcargo: number }[] = await sql.query("select ec.idcargo from evento_cargo ec inner join cargo c on c.idcargo = ec.idcargo where ec.id_evento = ? order by c.nome asc", [id_evento]);
				evento.ids_cargo = new Array(cargos.length);
				for (let i = cargos.length - 1; i >= 0; i--)
					evento.ids_cargo[i] = cargos[i].idcargo;

				return evento;
			}

			return null;
		});
	}

	public static async alterar(evento: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(evento, false)))
			return res;

		return Sql.conectar(async (sql) => {
			await sql.beginTransaction();

			await sql.query("update evento set nome_evento = ?, desc_evento = ?, inicio_evento = ?,  termino_evento = ? where id_evento = ?",[evento.nome_evento, evento.desc_evento, evento.inicio_evento, evento.termino_evento, evento.id_evento]);

			if (!sql.linhasAfetadas)
				return "Evento não encontrado";

			await sql.query("delete from evento_departamento where id_evento = ?", [evento.id_evento]);

			for (let i = 0; i < evento.ids_departamento.length; i++)
				await sql.query("insert into evento_departamento (id_evento, id_departamento) values (?, ?)", [evento.id_evento, evento.ids_departamento[i]]);

			await sql.query("delete from evento_cargo where id_evento = ?", [evento.id_evento]);

			for (let i = 0; i < evento.ids_cargo.length; i++)
				await sql.query("insert into evento_cargo (id_evento, idcargo) values (?, ?)", [evento.id_evento, evento.ids_cargo[i]]);

			await sql.query("update evento_sala set id_sala = ? where id_evento = ?", [evento.id_sala, evento.id_evento]);

			let novasOcorrencias = evento.ocorrencias;
			let ocorrenciasAntigas: { id_ocorrencia: number, inicio_ocorrencia: string }[] = await sql.query("select id_ocorrencia, date_format(inicio_ocorrencia, '%Y-%m-%d %H:%i:%s') inicio_ocorrencia from evento_ocorrencia where id_evento = ?", [evento.id_evento]);

			for (let i = ocorrenciasAntigas.length - 1; i >= 0; i--) {
				const inicio_ocorrencia = ocorrenciasAntigas[i].inicio_ocorrencia;

				for (let j = novasOcorrencias.length - 1; j >= 0; j--) {
					if (novasOcorrencias[j] === inicio_ocorrencia) {
						ocorrenciasAntigas.splice(i, 1);
						novasOcorrencias.splice(j, 1);
						break;
					}
				}
			}

			for (let i = ocorrenciasAntigas.length - 1; i >= 0; i--)
				await sql.query("delete from evento_ocorrencia where id_ocorrencia = ? and id_evento = ?", [ocorrenciasAntigas[i].id_ocorrencia, evento.id_evento]);

			for (let i = novasOcorrencias.length - 1; i >= 0; i--)
				await sql.query("insert into evento_ocorrencia (id_evento, inicio_ocorrencia) values (?, ?)", [evento.id_evento, novasOcorrencias[i]]);

			await sql.commit();

			return null;
		});
	}

	public static excluir(id_evento: number): Promise<string> {
		return Sql.conectar(async (sql) => {
			await sql.query("delete from evento where id_evento = ?", [id_evento]);

			if (!sql.linhasAfetadas)
				return "Evento não encontrado";

			return null;
		});
	}
}
