import Sql = require("../infra/sql"); 
import DataUtil = require("../utils/dataUtil");

export = class Ponto {
	public idponto: number;
	public idusuario: number;
	public entrada: string;
	public saida: string;

	public static async listar(ano: number, mes: number, idusuario?: number, id_departamento?: number): Promise<{ idusuario: number, nome: string, data: string }[]> {
		let lista: { idusuario: number, nome: string, data: string }[] = null,
			proximo_ano = ano,
			proximo_mes = mes + 1;

		if (proximo_mes > 12) {
			proximo_mes = 1;
			proximo_ano++;
		}

		const inicio = `${ano}-${mes}-01`,
			fim = `${proximo_ano}-${proximo_mes}-01`;

		await Sql.conectar(async (sql: Sql) => {
			const params: any[] = [inicio, fim];
			let where = "";

			if (idusuario) {
				params.push(idusuario);
				where += " and p.idusuario = ?";
			}

			if (id_departamento) {
				params.push(id_departamento);
				where += " and u.id_departamento = ?";
			}

			lista = await sql.query("select p.idusuario, u.nome, d.desc_departamento, date_format(p.entrada, '%Y-%m-%d %H:%i') data from ponto p inner join usuario u on u.idusuario = p.idusuario inner join departamento d on d.id_departamento = u.id_departamento where p.entrada >= ? and p.entrada < ?" + where, params);
		});

		return lista || [];
	}

	public static async marcarEntrada(idusuario: number, qr: string, online: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!online) {
				const valido = await sql.scalar("select token from config where qr1 = ? or qr2 = ?", [qr, qr]);
				if (!valido) {
					res = "Código QR inválido";
					return;
				}
			}

			const agora = DataUtil.horarioDeBrasiliaISOComHorario(),
				hoje = DataUtil.removerHorarioISO(agora);

			const idponto = await sql.scalar("select idponto from ponto where date(entrada) = ? and idusuario = ?", [hoje, idusuario]) as number;
			if (idponto) {
				res = "Já existe um ponto aberto para a data atual";
				return;
			}

			await sql.query("insert into ponto (idusuario, entrada) values (?, ?)", [idusuario, agora]);
		});

		return res;
	}

	public static async marcarSaida(idusuario: number, qr: string, online: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!online) {
				const valido = await sql.scalar("select token from config where qr1 = ? or qr2 = ?", [qr, qr]);
				if (!valido) {
					res = "Código QR inválido";
					return;
				}
			}

			const agora = DataUtil.horarioDeBrasiliaISOComHorario(),
				hoje = DataUtil.removerHorarioISO(agora);

			const idponto = await sql.scalar("select idponto from ponto where date(entrada) = ? and idusuario = ?", [hoje, idusuario]) as number;
			if (!idponto) {
				res = "Não existe um ponto aberto para a data atual";
				return;
			}

			await sql.query("update ponto set saida = ? where idponto = ? and saida is null", [agora, idponto]);

			if (sql.linhasAfetadas === 0)
				res = "Já foi marcada a saída para a data atual";
		});

		return res;
	}
};
