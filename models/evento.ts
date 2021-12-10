import Sql = require("../infra/sql");
import DataUtil = require("../utils/dataUtil");

export = class Evento {
	public id_evento: number;
	public nome_evento: string;
	public desc_evento: string;
	public inicio_evento: string;
	public termino_evento: string;
	public id_departamento:number;
	public id_sala:number;
	public ocorrencias: string[];

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

	public static validar(evento: Evento): string {
		
		if(!evento){
			return "Dados inválidos";
		}

		evento.nome_evento = (evento.nome_evento || "").normalize().trim();
		if(!evento.nome_evento || evento.nome_evento.length>100){
			return "Nome inválido";
		}

		evento.desc_evento = (evento.desc_evento || "").normalize().trim();
		if(evento.desc_evento.length>100){
			return "Link / URL inválida";
		}

		evento.inicio_evento = DataUtil.converterDataISO(evento.inicio_evento);
		if(!evento.inicio_evento) {
			//validação de data será aqui?
			return "Data de Início inválida";
		}
		evento.termino_evento = DataUtil.converterDataISO(evento.termino_evento);
		if(!evento.termino_evento) {
			//validação de data será aqui?
			return "Data de Término inválida";
		}

		const regexp = /[\/\-\:\s]/g,
			inicio = parseInt(evento.inicio_evento.replace(regexp, "")),
			termino = parseInt(evento.termino_evento.replace(regexp, ""));
		if (inicio > termino)
			return "Data de Início deve ser anterior à Data de Término";

		evento.id_departamento = parseInt(evento.id_departamento as any);
		if (isNaN(evento.id_departamento)) {
			return "departamento inválida";
		}
		evento.id_sala = parseInt(evento.id_sala as any);
		if (isNaN(evento.id_sala)) {
			return "Sala inválida";
		}
		if (!evento.ocorrencias) {
			evento.ocorrencias = [];
		} else {
			if (!Array.isArray(evento.ocorrencias))
				evento.ocorrencias = [ evento.ocorrencias as any ];

			for (let i = evento.ocorrencias.length - 1; i >= 0; i--) {
				if (!(evento.ocorrencias[i] = DataUtil.converterDataISO(evento.ocorrencias[i])))
					return "Data da ocorrência inválida";
				const ocorrencia = parseInt(evento.ocorrencias[i].replace(regexp, ""));
				if (ocorrencia < inicio)
					return "Data da ocorrência anterior ao início do evento";
				if (ocorrencia > termino)
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

	public static async listar(id_departamento?: number, id_sala?: number, ano?: number, mes?: number, dia?: number): Promise<Evento[]>{
        let lista: Evento[] = null;
        await Sql.conectar(async (sql) => {
			let where = "";
			let parametros: any[] = [];

			if (id_departamento > 0) {
				if (where)
					where += " and ";
				where += " et.id_departamento = ? ";
				parametros.push(id_departamento);
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

			lista = await sql.query(`select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%d/%m/%Y') inicio_evento, date_format(e.termino_evento, '%d/%m/%Y') termino_evento, et.id_departamento, t.desc_departamento, es.id_sala, s.desc_sala from evento e 
			inner join evento_departamento et on et.id_evento = e.id_evento
			inner join evento_sala es on es.id_evento = e.id_evento
			inner join departamento t on t.id_departamento = et.id_departamento
			inner join sala s on s.id_sala = es.id_sala ` +
				(where ?
					(" where " + where) :
					""
				), parametros);
        });
        return lista;
	}

	public static async listarOcorrencias(id_departamento?: number, id_sala?: number, ano?: number, mes?: number, dia?: number): Promise<Evento[]>{
        let lista: Evento[] = null;
        await Sql.conectar(async (sql) => {
			let where = "";
			let parametros: any[] = [];

			if (id_departamento > 0) {
				if (where)
					where += " and ";
				where += " et.id_departamento = ? ";
				parametros.push(id_departamento);
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

			lista = await sql.query(`select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%d/%m/%Y') inicio_evento, date_format(e.termino_evento, '%d/%m/%Y') termino_evento, date_format(eo.inicio_ocorrencia, '%d/%m/%Y') inicio_ocorrencia, et.id_departamento, t.desc_departamento, es.id_sala, s.desc_sala from evento e 
			inner join evento_departamento et on et.id_evento = e.id_evento
			inner join evento_sala es on es.id_evento = e.id_evento
			inner join departamento t on t.id_departamento = et.id_departamento
			inner join sala s on s.id_sala = es.id_sala
			inner join evento_ocorrencia eo on eo.id_evento = e.id_evento ` +
				(where ?
					(" where " + where) :
					""
				), parametros);
        });
        return lista;
	}

	public static async criar(evento: Evento): Promise<string>{

		let res: string;
		if ((res = Evento.validar(evento)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into evento (nome_evento, desc_evento, inicio_evento, termino_evento) values (?,?,?,?)",[evento.nome_evento, evento.desc_evento, evento.inicio_evento, evento.termino_evento]);
				const id_evento = await sql.scalar("select last_insert_id()") as number;
				await sql.query(" insert into evento_departamento(id_departamento, id_evento) values (?, ?)", [evento.id_departamento, id_evento]);
				await sql.query(" insert into evento_sala(id_sala, id_evento) values (?, ?)", [evento.id_sala, id_evento]);

				if (!evento.ocorrencias.length)
					evento.ocorrencias.push(evento.inicio_evento);

				for (let i = 0; i < evento.ocorrencias.length; i++)
					await sql.query("insert into evento_ocorrencia (id_evento, inicio_ocorrencia) values (?, ?)", [id_evento, evento.ocorrencias[i]]);

				await sql.commit();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = `O evento ${evento.nome_evento} já existe`; // evento.nome que está no alterar.ejs
				else
					throw e;
			}
		});

		return res;


    } 

	public static async obter(id_evento:number): Promise<Evento>{
        let evento: Evento = null;

        await Sql.conectar(async(sql)=>{
			let lista: Evento[] = await sql.query("select e.id_evento, e.nome_evento, e.desc_evento, date_format(e.inicio_evento, '%Y-%m-%d') inicio_evento, date_format(e.termino_evento, '%Y-%m-%d') termino_evento, et.id_departamento, es.id_sala from evento e inner join evento_departamento et on et.id_evento = e.id_evento inner join evento_sala es on es.id_evento = e.id_evento where e.id_evento = ?",[id_evento]);
         
            if(lista && lista.length){
                evento = lista[0];

				let ocorrencias: { inicio_ocorrencia: string }[] = await sql.query("select date_format(inicio_ocorrencia, '%Y-%m-%d') inicio_ocorrencia from evento_ocorrencia where id_evento = ?",[id_evento]);
				evento.ocorrencias = new Array(ocorrencias.length);
				for (let i = ocorrencias.length - 1; i >= 0; i--)
					evento.ocorrencias[i] = ocorrencias[i].inicio_ocorrencia;
				evento.ocorrencias.sort();
            }
        });

        return evento;

    }

	public static async alterar(evento: Evento): Promise<string>{
        let erro: string = Evento.validar(evento);
        if(erro){
            return erro;
        }
        await Sql.conectar(async(sql)=>{
			await sql.beginTransaction();

			await sql.query("update evento set nome_evento = ?, desc_evento = ?, inicio_evento = ?,  termino_evento = ? where id_evento = ?",[evento.nome_evento, evento.desc_evento, evento.inicio_evento, evento.termino_evento, evento.id_evento]);
            if(!sql.linhasAfetadas){
				erro = 'Evento não encontrado';
				return;
            }

			await sql.query(" update evento_departamento set id_departamento = ? where id_evento = ?", [evento.id_departamento, evento.id_evento]);
			await sql.query(" update evento_sala set id_sala = ? where id_evento = ?", [evento.id_sala, evento.id_evento]);

			let novasOcorrencias = evento.ocorrencias;
			let ocorrenciasAntigas: { id_ocorrencia: number, inicio_ocorrencia: string }[] = await sql.query("select id_ocorrencia, date_format(inicio_ocorrencia, '%Y-%m-%d') inicio_ocorrencia from evento_ocorrencia where id_evento = ?", [evento.id_evento]);

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
        });

        return erro;
    }

	public static async excluir(id_evento:number): Promise<string>{
        let erro: string = null;

        await Sql.conectar(async(sql)=>{
			await sql.beginTransaction();
			await sql.query("delete from evento_departamento where id_evento=?;",[id_evento]);
			await sql.query("delete from evento_sala where id_evento=?;",[id_evento]);
			await sql.query("delete from evento_ocorrencia where id_evento=?;",[id_evento]);

            let lista = await sql.query("delete from evento where id_evento=?;",[id_evento]);

            if(!sql.linhasAfetadas){
                erro = 'Evento não encontrado';
			}
			
			await sql.commit();

        });

        return erro;

	}
}
